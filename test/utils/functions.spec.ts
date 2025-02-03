import { pipe } from "../../src/utils/functions";

describe('pipe', () => {

  const addTwo = (num: number) => num + 2;
  const timesTwo = (num: number) => num * 2;

  it('should pipe the result of one function into the params of the next', () => {
    const result = pipe(addTwo, timesTwo)(10)

    expect(result).toBe(24);
  });

  it('should care about the order of functions - change the order, change the result', () => {
    const result = pipe(timesTwo, addTwo)(10)

    expect(result).toBe(22);
  });

});