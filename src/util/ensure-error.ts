import {inspect} from 'node:util'

// Adapted from 'ensure-error' with license:
//
// MIT License
//
// Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (https://sindresorhus.com)
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
// IN THE SOFTWARE.

class Unknown extends Error {
  name = 'Unknown'
  constructor(message: unknown) {
    super(inspect(message))
  }
}

export default function ensureError(input: unknown): Error {
  if (!(input instanceof Error)) {
    return new Unknown(input)
  } else {
    const error = input
    if (!error.name) {
      Object.defineProperty(error, 'name', {
        value: (error.constructor && error.constructor.name) || 'Error',
        configurable: true,
        writable: true
      })
    }
    if (!error.message) {
      Object.defineProperty(error, 'message', {
        value: '<No error message>',
        configurable: true,
        writable: true
      })
    }
    if (!error.stack) {
      Object.defineProperty(error, 'stack', {
        value: new Error(error.message).stack?.replace(
          /\n {4}at /,
          '\n<Original stack missing>$&'
        ),
        configurable: true,
        writable: true
      })
    }
    return error
  }
}
