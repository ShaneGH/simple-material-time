import { AmPm } from './distance';
import { convert12hTo24h, convert24hTo12h } from './time';
import { registerKeyEvent } from './utils';


function increase(val: string, max: number) {
    var v = parseInt(val) + 1;
    return  v > max ? 0 : v;
}

function decrease(val: string, max: number) {
    var v = parseInt(val) - 1;
    return v < 0 ? max : v;
}

function getNewElementValues(element: HTMLInputElement, key: string, max: number) {
    var actualStart = element.selectionStart || 0;
    var start = actualStart > 1 ? 
        1 : 
        actualStart ;

    var val1 = (element.value || "").substr(0, start);
    var val2 = (element.value || "").substr(start + 1);

    var value = parseInt(`${val1}${key}${val2}`);
    if (isNaN(value) || value < 0) return null;

    if (value <= max) {
        var skip = 0;
        if (!val1 && !val2 && value * 10 > max) {
            // special case for when only 1 digit fits in the text box
            skip++;
        }

        return {
            value,
            nextPosition: actualStart + 1 + skip
        };
    }

    if (!actualStart) {
        // set last digit to 0 and try again
        value -= value % 10;
        if (value <= max)
            return {
                value,
                nextPosition: actualStart + 1
            };
            
        // just use the key as is
        value = parseInt(key);
        if (!isNaN(value) && value <= max) 
            return {
                value,
                // skipped an extra digit by using first key
                nextPosition: actualStart + 2
            };
    }
    
    return null;
}

type KeyPressDetailsValues =
    {
        handled?: boolean
        value?: number
        nextPosition?: number
    }

var numberKey = /^\d$/;
var fKey = /^F\d+$/;
function keyPressDetails(element: HTMLInputElement, e: KeyboardEvent, max: number): KeyPressDetailsValues {

    var handled = true;
    switch (e.key) {
        case "ArrowUp":
            return {
                handled: true,
                value: increase(element.value, max)
            };
        case "ArrowDown":
            return {
                handled: true,
                value: decrease(element.value, max)
            };
        case "ArrowRight":
            var nextPosition = (element.selectionStart || 0) + 1;
            return {
                handled: nextPosition > 2,
                nextPosition: nextPosition > 2 ? nextPosition : undefined
            };
        case "ArrowLeft":
            var nextPosition = (element.selectionStart || 0) - 1;
            return {
                handled: nextPosition < 0,
                nextPosition: nextPosition < 0 ? nextPosition : undefined
            };
        case "Tab":
            return {
                handled: false
            };
        default:
            if (numberKey.test(e.key)) {
                return {
                    handled: true,
                    ...getNewElementValues(element, e.key, max)
                };
            } else if (fKey.test(e.key)) {
                return {
                    handled: false
                };
            }
    }
    
    return { handled: true };
}

abstract class NumberInput {

    _keyPressHandler: () => void
    _focusHandler: () => void

    protected value = 0
    constructor(public input: HTMLInputElement) {
        this._keyPressHandler = registerKeyEvent(input, "keydown", e => this.keyDown(e));
        this._focusHandler = registerKeyEvent(input, "focus", e => this.focusOnInput());
    }

    _onFocus: (() => void)[] = []
    onFocus(f: () => void) {
        this._onFocus.push(f);
    }

    _onNextCallbacks: (() => void)[] = []
    onNext(f: () => void) {
        this._onNextCallbacks.push(f);
    }

    _onPreviousCallbacks: (() => void)[] = []
    onPrevious(f: () => void) {
        this._onPreviousCallbacks.push(f);
    }
    
    _timeChangedCallbacks: ((value: number) => void)[] = [];
    onTimeChanged(callback: ((value: number) => void)) {
        this._timeChangedCallbacks.push(callback);
    }

    protected abstract getMaxValue(): number

    private keyDown(e: KeyboardEvent) {
        var details = keyPressDetails(this.input, e, this.getMaxValue());
        
        if (details.handled) e.preventDefault();
        if (details.value != null) {
            this._set(details.value);
        }

        if (details.nextPosition != null) {
            if (details.nextPosition < 0) {
                this._onPreviousCallbacks.forEach(f => f());
            } else {
                this.input.selectionEnd = details.nextPosition;
                this.input.selectionStart = details.nextPosition;
                if (details.nextPosition > 1) {
                    this._onNextCallbacks.forEach(f => f());
                }
            }
        }
    }

    private focusOnInput() {
        this._onFocus
            .slice(0)
            .forEach(f => f());
    }

    set(value: number) {
        if (value < 0 || value > this.getMaxValue()) throw new Error(`Invalid value "${value}"`);
        this._set(parseInt(value.toFixed()));
    }

    private _set(value: number) {
        var changed = this.value !== value;

        this.value = value;
        this.input.value = this.transformInputValue(value);

        if (changed) {
            this._timeChangedCallbacks
                .slice(0)
                .forEach(f => f(value));
        }
    }

    abstract transformInputValue(value: number): string

    focus() {
        this.input.classList.add("mtl-focus");
        this.input.focus();
        this.input.selectionStart = 0;
        this.input.selectionEnd = 0;
    }

    blur() {
        this.input.classList.remove("mtl-focus");
    }

    dispose() {
        this._focusHandler();
        this._keyPressHandler();
        
        this._onFocus.length = 0;
        this._onPreviousCallbacks.length = 0;
        this._onNextCallbacks.length = 0;
        this._timeChangedCallbacks.length = 0;
    }
}

class HourInput extends NumberInput {
    getMaxValue() { return 23; }

    private mode: 12 | 24 = 24
    setTo12Hr(amPm?: AmPm) {
        var value = this.value;
        if (amPm) {
            value = convert12hTo24h(
                convert24hTo12h(value), 
                amPm);
        }

        this.mode = 12;
        this.set(value);
    }

    setTo24Hr() {
        this.mode = 24;
        this.set(this.value);
    }

    transformInputValue(value: number) {
        if (this.mode === 12) {
            if (!value) value = 12;
            else if (value > 12) value -= 12;

            return value.toString();
        }

        return `0${value}`.slice(-2);
    }
}

class MinuteInput extends NumberInput {
    getMaxValue() { return 59; }
    transformInputValue(value: number) {
        return `0${value}`.slice(-2);
    }
}

export {
    HourInput,
    MinuteInput,
    NumberInput
}