/**
 * @license
 * Copyright 2018 Google Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

import {numbers, strings} from './constants';

const {ARIA_LIVE_IE11_DELAY_MS} = numbers;
const {LABEL_TEXT_ATTR} = strings;

export function announce(rootEl, labelEl) {
  const role = rootEl.getAttribute('role');
  const priority = rootEl.getAttribute('aria-live');
  const labelText = labelEl.textContent.trim(); // Ignore `&nbsp;` (see below)
  if (!labelText) {
    return;
  }

  // Temporarily disable `aria-live` to prevent NVDA from announcing an empty message.
  // If the snackbar has an action button, clearing `textContent` will cause NVDA to
  // announce the button, but not the label.
  rootEl.setAttribute('role', 'none');
  rootEl.setAttribute('aria-live', 'off');

  // Temporarily clear `textContent` to force a DOM mutation event that will be detected by screen readers.
  // `aria-live` elements are only announced when the element's `textContent` *changes*, so snackbars
  // sent to the browser in the initial HTML response won't be read unless we clear the element's `textContent` first.
  // Similarly, displaying the same snackbar message twice in a row doesn't trigger a DOM mutation event,
  // so screen readers won't announce the second message unless we first clear `textContent`.
  //
  // This technique has been tested in:
  //
  //   * JAWS 18.0 & 2019:
  //       - Chrome 70
  //       - Firefox 60 (ESR)
  //       - IE 11
  //   * NVDA 2017 & 2018:
  //       - Chrome 70
  //       - Firefox 60 (ESR)
  //       - IE 11
  //
  // TODO(acdvorak): Is `role="alert"` necessary?
  labelEl.textContent = '';

  // The `&nbsp;` is necessary for JAWS and NVDA in Chrome when NOT using `role="alert"`.
  // Note: Setting `position: absolute`, `opacity: 0`, or `height: 0` prevents Chrome from announcing the message.
  // labelEl.innerHTML = '<span style="display: inline-block; width: 0; height: 1px;">&nbsp;</span>';

  // Prevent visual jank by temporarily displaying the label text in the ::before pseudo-element.
  // CSS generated content is normally announced by screen readers
  // (except in IE 11; see https://tink.uk/accessibility-support-for-css-generated-content/);
  // however, `aria-live` is turned off, so this DOM update will be ignored by screen readers.
  labelEl.setAttribute(LABEL_TEXT_ATTR, labelText);

  // TODO(acdvorak): Experiment with nested setTimeout() calls to see if we can avoid ARIA_LIVE_IE11_DELAY_MS.
  setTimeout(() => {
    // Allow screen readers to announce changes to the DOM again.
    rootEl.setAttribute('role', role);
    rootEl.setAttribute('aria-live', priority);

    // Remove the message from the ::before pseudo-element.
    labelEl.removeAttribute(LABEL_TEXT_ATTR);

    // Restore the original label text, which will be announced by screen readers.
    labelEl.textContent = labelText;
  }, isIE11() ? ARIA_LIVE_IE11_DELAY_MS : 0);
}

function isIE11() {
  const detectorEl = document.createElement('div');
  detectorEl.classList.add('mdc-snackbar-ie11-detector');
  document.body.appendChild(detectorEl);
  const position = window.getComputedStyle(detectorEl).position;
  const isIE = position === 'relative';
  document.body.removeChild(detectorEl);
  return isIE;
}
