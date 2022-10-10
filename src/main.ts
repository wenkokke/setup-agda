import * as core from '@actions/core'
import * as opts from './opts'
import setupAgda from './setup-agda'

setupAgda(
  Object.fromEntries(
    opts.setupAgdaInputKeys.map(key => [key, core.getInput(key)])
  )
)
