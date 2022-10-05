import * as core from '@actions/core'
import {yamlInputs} from './opts'
import setupAgda from './setup-agda'

setupAgda(
  Object.fromEntries(Object.keys(yamlInputs).map(k => [k, core.getInput(k)]))
)
