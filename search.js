const fs = require('fs');
const math = require('mathjs');

module.exports = {insert, binarySearch};

function insert(input, array) {

    for (var i = 0; i < array.length; i++) {
        if (input > array[i])
            continue;
        else if (input < array[i]) {
            for (var j = array.length; j >= i; j--)
                array[j] = array[j-1];
            array[i] = input;
            return;
        }
    }
    
    array[i] = input;

}

function binarySearch(sortedArray, key){
    let start = 0;
    let end = sortedArray.length - 1;

    while (start <= end) {
        let middle = Math.floor((start + end) / 2);

        if (sortedArray[middle] === key) {
            // found the key
            return middle;
        } else if (sortedArray[middle] < key) {
            // continue searching to the right
            start = middle + 1;
        } else {
            // search searching to the left
            end = middle - 1;
        }
    }
	// key wasn't found
    return -1;
}


