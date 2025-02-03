import errorExtractor from '../../src/utils/errorExtractor';

it('errorExtractor() should return a valid error object', () => {
  const data = {
    details: [{ type: 'info', path: ['src', 'home'] }],
  };

  const result = errorExtractor(data);

  const expectedResult = { 'src.home': 'error.src.home.info' };
  expect(result).toEqual(expectedResult);
});

it('errorExtractor() should return a valid error object when context and label exists', () => {
  const data = {
    details: [{ type: 'info', context: { label: 'blah' }, path: [] }],
  };

  const result = errorExtractor(data);

  const expectedResult = { 'blah':'error.blah.info' };
  expect(result).toEqual(expectedResult);
});