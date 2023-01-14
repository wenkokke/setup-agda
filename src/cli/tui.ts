import select from '@inquirer/select'
import {
  agdaStdlibInfo,
  agdaInfo,
  agdaVersions,
  agdaStdlibVersions
} from '../util/types.js'
import { platform } from '../util/platform.js'
import { AgdaStdlibVersion, AgdaVersion } from '../util/types.js'

type Choice = {
  value: string
  name?: string
  description?: string
  disabled?: boolean
}

export default async function tui(): Promise<void> {
  const agdaChoices: Choice[] = agdaVersions.flatMap(
    (agdaVersion: AgdaVersion) => {
      const binary = agdaInfo[agdaVersion].binary
      if (binary === undefined) {
        return []
      } else {
        return {
          name: agdaVersion,
          value: agdaVersion,
          disabled: binary?.[platform] === undefined
        }
      }
    }
  )
  const agdaStdlibChoices: Choice[] = agdaStdlibVersions.flatMap(
    (agdaStdlibVersion: AgdaStdlibVersion) => {
      const source = agdaStdlibInfo[agdaStdlibVersion]?.source
      if (source === undefined) {
        return []
      } else {
        return {
          name: agdaStdlibVersion,
          value: agdaStdlibVersion,
          disabled: false
        }
      }
    }
  )
  await select({
    message: '',
    choices: [...agdaChoices, ...agdaStdlibChoices]
  })
}
