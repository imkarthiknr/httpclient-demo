import { HttpErrorResponse } from '@angular/common/http';
import { describeHttpError } from './http-error';

describe('describeHttpError', () => {
  const err = (status: number) => new HttpErrorResponse({ status });

  it.each([
    [0, 'Cannot reach the API'],
    [404, 'Not found'],
    [400, 'rejected'],
    [500, '500'],
    [418, 'Request failed (418)'],
  ])('maps status %i', (status, text) => {
    expect(describeHttpError(err(status))).toContain(text);
  });

  it('has a fallback for non-HTTP errors', () => {
    expect(describeHttpError(new Error('x'))).toContain('Something went wrong');
  });
});
