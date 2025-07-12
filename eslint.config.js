// @ts-check
import antfu from '@antfu/eslint-config'

/**
 *
 * Antfu Lint Docs
 * https://github.com/antfu/eslint-config
 */
export default antfu(
  {
    type: 'lib',
    pnpm: true,
    markdown: false,
  },
  {
    rules: {
      'no-console': ['error', { allow: ['warn', 'error', 'log'] }],
      'node/prefer-global/process': 'off',
    },
  },
)
