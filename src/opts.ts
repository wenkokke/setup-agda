import {readFileSync} from 'fs'
import {load} from 'js-yaml'
import {join} from 'path'

export const yamlInputs: Record<string, {default: string}> = (
  load(
    readFileSync(join(__dirname, '..', 'action.yml'), 'utf8')
    // The action.yml file structure is statically known.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) as any
).inputs
