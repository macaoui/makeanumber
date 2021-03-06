var levelFields = ['lname', 'size', 'min_number', 'max_number', 'ops', 'tgt_min', 'tgt_max', 'tgt_step', 'hasExactSol', 'mustUseAll',
                    'CGTarget', 'timer', 'last_ops', 'isCustom'];
var numlevelFields = [false, true, true,true, false, true,true,true, false,false,false,true,false,false]; //indicates if field is numeric

function string2readable(str, sep, sep2) {
    if (str.length < 2) {
        return str;
    }
    else {
        str_1 = str.substring(0, str.length - 1);
        output = str_1.split("").join(sep);
        return output + " " + sep2 + " " + str.charAt(str.length - 1);
    }
}

//f(index, key, default_value). Key is a level param
function getLStorage(index, k, default_value) {
    var key = index + "_" + k;
    if (localStorage.getItem(key)) {
        var value = localStorage.getItem(key);
    } else {
        var value = default_value;
        localStorage.setItem(key, value);
    }
    return value;
}

//f(index, key, value). Key is a level param
function setLStorage(index, k, v) {
    var key = index + "_" + k;
    localStorage.setItem(key, v);
}

function GameLevel(index, lname, size, min_number, max_number, ops, tgt_min, tgt_max, tgt_step, hasExactSol, mustUseAll, canGenerateTarget, timer, last_ops,isCustom) {
    this.index=index;
    this.lname = lname;
    this.size = size;
    this.ops = ops;
    this.last_ops = last_ops;
    if (typeof last_ops === 'undefined') {
        this.last_ops = ops;
    }
    this.min_number = min_number;
    this.max_number = max_number;
    this.tgt_min = tgt_min;
    this.tgt_max = tgt_max;
    this.tgt_step = tgt_step;
    this.hasExactSol = hasExactSol;
    this.mustUseAll = mustUseAll;
    this.CGTarget = canGenerateTarget;
    this.timer = timer;
    this.isCustom =  isCustom || false;
}

GameLevel.prototype.getLevel = function (defaultLevel) {
    for (k in levelFields) {
        this[levelFields[k]] = getLStorage(this.index, levelFields[k], defaultLevel[levelFields[k]]);
        if (numlevelFields[k]) {
            this[levelFields[k]] = parseInt(this[levelFields[k]]);
        }
    }
}

GameLevel.prototype.setLevel = function () {
    for (k in levelFields) {
        setLStorage(this.index, levelFields[k], this[levelFields[k]]);
    }
}

function GameHandler(gameLevel, getValue) {
    this.min_target = gameLevel.tgt_min;
    this.max_target = gameLevel.tgt_max;
    this.step_target = gameLevel.tgt_step;
    this.target = this.generateRandomNumbers(gameLevel.tgt_min, gameLevel.tgt_max, gameLevel.tgt_step);
    this.min_number = gameLevel.min_number;
    this.max_number = gameLevel.max_number;
    this.size = gameLevel.size;
    this.hasExactSolution = gameLevel.hasExactSol;
    this.mustUseAll = gameLevel.mustUseAll;
    this.CGTarget = gameLevel.CGTarget;
    this.Numbers = new Array(this.size);
    this.objNumbers = new Array(this.size);
    this.operations = gameLevel.ops.toString().split("");
    this.lastOperations = gameLevel.last_ops.toString().split("");
    this.foundSol = false;
    this.bestSolution = new Array();
    this.listOfSolutions = new Array();
    this.hintList = new Array();
    this.selectSol = "";
    this.getValue= getValue;
    this.generateError= this.generateNumbers();
}

function ObjNumber(n, s) {
    this.value = parseInt(n);
    this.computation = s;
    this.first_result = '';  // for hint purpose
}

function SolutionList() {
    this.lowerSol = -9999;
    this.upperSol = 9999;
    this.upperSolList = new Array();
    this.lowerSolList = new Array();
}

// generate a random integer in [first;last] with step.
GameHandler.prototype.generateRandomNumbers = function (min, max, step) {
    var nsteps = (max - min + 1) / step;
    return min + step * Math.floor(nsteps * Math.random());
};

//generate a new Numbers set and list all solutions.
GameHandler.prototype.generateNumbers = function () {
    var generateNumbersError = "";
    // test and parse getValue. If getVAlue is valid then use target, numbers, ops, mustUseAll, hasASolution from it.
    var getOK=true;
    var gTest=this.getValue;
    if(typeof gTest['t'] !== 'undefined') {
        if (Number.isInteger(parseInt(gTest['t']))) {
            var getTarget=parseInt(gTest['t']);
        } else { getOK=false; }
    } else { getOK=false; }    

    if(typeof gTest['n'] !== 'undefined') {
        if (Number.isInteger(parseInt(gTest['n']))) {
            var getNumbers=[];
            var nn=parseInt(gTest['n']);
            while(nn % 100 >0 && getNumbers.length<6) {
                getNumbers.push(nn %100);
                nn= (nn- (nn%100))/100;
            }
            if (getNumbers.length<1) {getOK=false};
        } else { getOK=false; }
    } else { getOK=false; } 

    if(typeof gTest['o'] !== 'undefined') {
        if (typeof gTest['o'] === 'string' || gTest['o'] instanceof String) {
            var getOps=[];
            if (gTest['o'].indexOf("p") >= 0) {
                getOps.push("+");
            }       
            if (gTest['o'].indexOf("m") >= 0) {
                getOps.push("-");
            }    
            if (gTest['o'].indexOf("x") >= 0) {
                getOps.push("x");
            }        
            if (gTest['o'].indexOf("d") >= 0) {
                getOps.push("/");
            }  
            if (getOps.length===0) {getOK=false};
        } else { getOK=false; }
    } else { getOK=false; }

    if(getOK) {
        this.target=getTarget;
        this.Numbers=getNumbers.reverse();
        this.size= getNumbers.length;
        this.objNumbers = new Array(this.size);
        for (var i = 0; i < this.size; i++) {
            this.objNumbers[i] = new ObjNumber(this.Numbers[i], this.Numbers[i].toString());
        }
        this.operations= getOps;
        this.mustUseAll= !(parseInt(gTest['a'])===0);
        this.hasExactSolution= !(parseInt(gTest['s'])===0);
    }
    else {
        this.target = this.generateRandomNumbers(this.min_target, this.max_target, this.step_target);
        for (var i = 0; i < this.size; i++) {
            do {    //loop on numbers generation
                this.Numbers[i] = this.generateRandomNumbers(this.min_number, this.max_number, 1);
            }
            while (!this.CGTarget && this.Numbers[i] === this.target);
            this.objNumbers[i] = new ObjNumber(this.Numbers[i], this.Numbers[i].toString());
        }
    }

    this.foundSol = false;
    this.listOfSolutions = [];
    this.bestSolution = [];
    this.stringSolutions = [];
    this.hintList = [];
    var allSolutions = this.findSolution(this.objNumbers, this.target, this.mustUseAll);

    if (allSolutions.lowerSol === this.target) {
        this.foundSol = true;
    }
    else {
        if(this.hasExactSolution) {     //target is forced to be equal to the closest solution.
            if(this.target-allSolutions.lowerSol < allSolutions.upperSol-this.target) {
                this.target=allSolutions.lowerSol;
            }
            else {
                this.target=allSolutions.upperSol; 
            }
            this.foundSol=true;
        }
    }

    if (generateNumbersError.length === 0) {
        if (allSolutions.lowerSol === this.target) {
            this.bestSolution.push(this.target);
            for (var i = 0; i < allSolutions.lowerSolList.length; i++) {
                this.listOfSolutions.push(allSolutions.lowerSolList[i]);
                this.stringSolutions.push(allSolutions.lowerSolList[i].computation);
            }
        }
        else {
            if (this.target - allSolutions.lowerSol <= allSolutions.upperSol - this.target) {
                this.bestSolution.push(allSolutions.lowerSol);
                for (var i = 0; i < allSolutions.lowerSolList.length; i++) {
                    this.listOfSolutions.push(allSolutions.lowerSolList[i]);
                    this.stringSolutions.push(allSolutions.lowerSolList[i].computation);
                }
            }
            if (this.target - allSolutions.lowerSol >= allSolutions.upperSol - this.target) {
                this.bestSolution.push(allSolutions.upperSol);
                for (var i = 0; i < allSolutions.upperSolList.length; i++) {
                    this.listOfSolutions.push(allSolutions.upperSolList[i]);
                    this.stringSolutions.push(allSolutions.upperSolList[i].computation);
                }
            }
        }

        this.hintList = this.getHint(this.listOfSolutions);
    }
    return generateNumbersError;
};

GameHandler.prototype.operate = function (a, b, oper) {
    switch (oper) {
        case "+":
            return (a + b);
            break;
        case "-":
            return (a - b);
            break;
        case "x":
            return (a * b);
        case "/":
            if (b === 0) {
                return -1;
            }
            else {
                return a / b;
            }
            break;
        default:
    }
};

GameHandler.prototype.isValid = function (c) {
    return (c >= 0 && Math.abs(c - Math.round(c)) < 0.000001);
};

GameHandler.prototype.findSolution = function (objNum, tgt, mustUseAll) {
    var n = objNum.length;
    var newVal, newCalcul;
    var result = new SolutionList();

    //if only one item remaining, record final value.          
    if (n <= 1) {
        var v = objNum[0].value;
        if (v <= tgt) {
            result.lowerSol = v;
            result.lowerSolList.push(objNum[0]);
        }
        if (v >= tgt) {
            result.upperSol = v;
            result.upperSolList.push(objNum[0]);
        }
    }

        //general case
    else {
        objNum.sort(function (a, b) {
            return (b.value - a.value);   //sort in descending order;
        });
        //create a boolean array, same size as objNum to flag numbers which are doubled
        var isDouble = [];
        isDouble[0] = false;
        for (i = 1; i < n; i++) {
            isDouble[i] = (objNum[i].value === objNum[i - 1].value);
        }

        for (var i = 0; i < n - 1; i++) {
            if (isDouble[i] === false) {
                for (var j = i + 1; j < n; j++) {
                    if (isDouble[j] === false || (j === i + 1)) {
                        var numA = objNum[i];
                        var numB = objNum[j];
                        var a = numA.value;
                        var b = numB.value;
                        var ca = numA.computation;
                        var cb = numB.computation;
                        var fra = numA.first_result;
                        var frb = numB.first_result;
                        //build a new array from current one, removing the two numbers used for computation.
                        var newArray = new Array();
                        for (var k = 0; k < n; k++) {
                            if (k !== i && k !== j) {
                                newArray.push(objNum[k]);
                            }
                        }
                        //  perform each possible operation
                        var operArray = this.operations;
                        if (n === 2) {
                            operArray = this.lastOperations;
                        }
                        for (var l = 0; l < operArray.length; l++) {
                            newVal = this.operate(a, b, operArray[l]);

                            if (this.isValid(newVal)) {
                                newCalcul = (n === 2) ? ca + operArray[l] + cb : '(' + ca + operArray[l] + cb + ')';
                                var newNum = new ObjNumber(newVal, newCalcul);

                                if (fra.length=== 0 && frb.length===0) {
                                    newNum.first_result = ca + operArray[l] + cb;
                                }
                                else if (fra.length>0 && frb.length>0) {
                                    newNum.first_result=numA.first_result
                                }
                                else {
                                    newNum.first_result=numA.first_result+numB.first_result
                                }

                                if (!mustUseAll) {
                                    var v = newNum.value;
                                    var temp_result = new SolutionList();
                                    if (v <= tgt) {
                                        temp_result.lowerSol = v;
                                        temp_result.lowerSolList.push(newNum);
                                    }
                                    if (v >= tgt) {
                                        temp_result.upperSol = v;
                                        temp_result.upperSolList.push(newNum);
                                    }
                                    result = this.aggregateSolution(temp_result, result);
                                }
                                newArray.push(newNum);
                                var tempSolution = new SolutionList();
                                var newArray2 = [];      // to avoid newArray to be sorted due to the subsequent function calls.
                                for (var m = 0; m < newArray.length; m++) {
                                    newArray2.push(newArray[m]);
                                }
                                tempSolution = this.findSolution(newArray2, tgt, mustUseAll);
                                result = this.aggregateSolution(tempSolution, result);
                                newArray.pop();
                            }
                        }
                    }
                }
            }
        }
    }
    return result;
};

GameHandler.prototype.aggregateSolution = function (added, existing) {
    var result = existing;
    if (added.lowerSol > existing.lowerSol) {
        result.lowerSol = added.lowerSol;
        result.lowerSolList = [];
        result.lowerSolList = added.lowerSolList;
    }
    else if (added.lowerSol === existing.lowerSol) {
        for (var i = 0; i < added.lowerSolList.length; i++) {
            result.lowerSolList.push(added.lowerSolList[i]);
        }
    }
    if (added.upperSol < existing.upperSol) {
        result.upperSol = added.upperSol;
        result.upperSolList = [];
        result.upperSolList = added.upperSolList;
    }
    else if (added.upperSol === existing.upperSol) {
        for (var i = 0; i < added.upperSolList.length; i++) {
            result.upperSolList.push(added.upperSolList[i]);
        }
    }
    return result;
}

GameHandler.prototype.getHint = function (allSolutions) {
    var myHints = [];
    //Firts hint: indicate the best possible solution
    if (!this.hasExactSolution) {
        var firstHint = "Best solution is " + this.bestSolution.join(" or ");
        myHints.push(firstHint);
    }

    // Select one of the solution with the lowest type of operations used.
    allSolutions.sort(function () {
        return Math.random() - 0.5;
    });
    var n = allSolutions.length;
    var k = this.operations.length;
    var selected_index = 0;
    for (var i = 0; i < n; i++) {
        var count = 0;
        for (var l = 0; l < this.operations.length; l++) {
            if (allSolutions[i].computation.indexOf(this.operations[l]) >= 0) {
                count = count + 1;
            }
        }
        if (count < k) {
            k = count;
            selected_index = i;
        }
    }
    this.selectSol = allSolutions[selected_index];

    //Second hint: the operations to use.
    if (this.operations.length >= 2) {
        var used_oper = "";
        var not_used_oper = "";
        for (var l = 0; l < this.operations.length; l++) {
            if (this.selectSol.computation.indexOf(this.operations[l]) >= 0) {
                used_oper = used_oper + this.operations[l];
            }
            else {
                not_used_oper = not_used_oper + this.operations[l];
            }
        }
        var secondHint = "You can make it using only " + string2readable(used_oper,", ","and");
        if (not_used_oper.length === 1) {
            secondHint = "You can make it without " + not_used_oper.split("");
        }
        if (used_oper.length === this.operations.length) {
            secondHint = "You need all operations.";
        }
        myHints.push(secondHint);
    }

    // 3rd hint:  we indicate the first result to get or the first numbers to use.
    if (this.mustUseAll) {
        calcS=this.selectSol.first_result;
        calcS=calcS.replace('x','*');
        thirdHint= "You can start by making " +  eval(calcS).toString();
    }
    else {
        calcStart = this.selectSol.first_result.toString();
        for (var l=0; l<this.operations.length; l++) {
            calcStart=calcStart.replace(this.operations[l].toString(),",")
        }
        thirdHint = "You can start by using " + calcStart.split(",").join(" and ");
    }
    myHints.push(thirdHint);

    myHints.sort(function () {
        return Math.random() - 0.5;
    });

    return myHints;
};


