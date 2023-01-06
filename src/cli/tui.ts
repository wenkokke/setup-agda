import inquirer from 'inquirer'
import { agdaStdlibVersions, agdaVersions } from '../util/types'

export default async function tui(): Promise<void> {
  inquirer.prompt([
    {
      type: 'checkbox',
      name: 'command',
      choices: [
        new inquirer.Separator('Agda'),
        ...agdaVersions.map((agdaVersion) => {
          return {
            name: `Agda ${agdaVersion}`
          }
        }),
        new inquirer.Separator('agda-stdlib'),
        ...agdaStdlibVersions.map((agdaStdlibVersion) => {
          return {
            name: `agda-stdlib ${agdaStdlibVersion}`
          }
        })
      ]
    }
  ])
}
