import '@testing-library/jest-dom/vitest'
import { expect as vitestExpect } from 'vitest'
import * as matchers from '@testing-library/jest-dom/matchers'

// Vitest 4 can expose a worker-global expect that is not referentially equal
// to the instance imported by @testing-library/jest-dom/vitest. Extend both so
// DOM matchers are stable in full-suite and file-targeted invocations.
vitestExpect.extend(matchers)

const globalExpect = (globalThis as typeof globalThis & {
  expect?: typeof vitestExpect
}).expect

if (globalExpect && globalExpect !== vitestExpect) {
  globalExpect.extend(matchers)
}
