import * as core from '@actions/core'
import * as opts from './opts'
import setupAgda from './setup-agda'

setupAgda(opts.getOptions(core.getInput))
