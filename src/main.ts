import * as core from '@actions/core'
import { signAabFile, signApkFile } from './signing'
import path from 'path'
import fs from 'fs'
import * as ioUtils from './io-utils'
import * as io from '@actions/io'

async function run(): Promise<void> {
  try {
    if (process.env.DEBUG_ACTION === 'true') {
      core.debug('DEBUG FLAG DETECTED, SHORTCUTTING ACTION.')
      return
    }

    const releaseDir = core.getInput('releaseDir')
      ? core.getInput('releaseDir')
      : process.env.ANDROID_RELEASE_DIR
    const signingKeyBase64 = core.getInput('signingKey')
      ? core.getInput('signingKey')
      : process.env.ANDROID_SIGNING_KEY
    const alias = core.getInput('keyAlias')
      ? core.getInput('keyAlias')
      : process.env.ANDROID_KEY_ALIAS
    const keyStorePassword = core.getInput('keyStorePassword')
      ? core.getInput('keyStorePassword')
      : process.env.ANDROID_KEYSTORE_PASSWORD
    const keyPassword = core.getInput('keyPassword')
      ? core.getInput('keyPassword')
      : process.env.ANDROID_KEY_PASSWORD
    const appName = core.getInput('appName')
      ? core.getInput('appName')
      : process.env.ANDROID_APP_NAME
    const appVersion = core.getInput('appVersion')
      ? core.getInput('appVersion')
      : process.env.ANDROID_APP_VERSION
    const appPrefix = core.getInput('appPrefix')
      ? core.getInput('appPrefix')
      : process.env.ANDROID_APP_PREFIX

    if (
      !releaseDir ||
      !signingKeyBase64 ||
      !alias ||
      !keyStorePassword ||
      !keyPassword
    ) {
      throw new Error('Missing required input(s).')
    }

    console.log(
      `Preparing to sign key @ ${releaseDir} with provided signing key`
    )

    const releaseFiles = ioUtils.findReleaseFiles(releaseDir)

    if (releaseFiles && releaseFiles.length > 0) {
      const signingKey = path.join(releaseDir, 'signingKey.jks')
      saveSigningKey(signingKey, signingKeyBase64)

      let signedReleaseFiles = await signReleaseFiles(
        releaseFiles,
        releaseDir,
        signingKey,
        alias,
        keyStorePassword,
        keyPassword
      )

      if (appName || appVersion || appPrefix) {
        console.log('Renaming signed release files...')
        signedReleaseFiles = await renameSignedReleaseFiles(
          signedReleaseFiles,
          appName,
          appVersion,
          appPrefix
        )
      }

      setOutputVariables(signedReleaseFiles)

      console.log('Releases signed!')
    } else {
      throw new Error('No release files (.apk or .aab) could be found.')
    }
  } catch (error) {
    handleError(error)
  }
}
async function renameSignedReleaseFiles(
  signedReleaseFiles: string[],
  name = 'app',
  version?: string,
  prefix?: string
): Promise<string[]> {
  const architectures = [
    'arm64-v8a',
    'armeabi-v7a',
    'x86',
    'x86_64',
    'universal'
  ]
  const renamedFiles: string[] = []

  for (const file of signedReleaseFiles) {
    const ext = path.extname(file)
    const archMatch = architectures.find(arch => file.includes(arch))
    const architecture = archMatch ? archMatch : ''

    let newFilename: string
    if (signedReleaseFiles.length === 1 && !architecture) {
      newFilename = `${prefix ? `${prefix}-` : ''}${name}${version ? `-${version}` : ''}${ext}`
    } else {
      newFilename = `${prefix ? `${prefix}-` : ''}${name}${version ? `-${version}` : ''}${architecture ? `-${architecture}` : ''}${ext}`
    }

    const dir = path.dirname(file)
    let newFilePath = path.join(dir, newFilename)

    // check if file with newFilePath name already exist
    let duplicateIndex = 1
    while (fs.existsSync(newFilePath)) {
      console.error('File already exists:', newFilePath)
      newFilePath = `${path.join(dir, path.basename(newFilePath))}-${duplicateIndex++}${ext}`
    }

    await io.mv(file, newFilePath)
    console.log(`Renamed ${file} to ${newFilePath}`)
    renamedFiles.push(newFilePath)
  }

  return renamedFiles
}

function saveSigningKey(
  signingKeyPath: string,
  signingKeyBase64: string
): void {
  try {
    fs.writeFileSync(signingKeyPath, signingKeyBase64, 'base64')
  } catch (error: any) {
    throw new Error(`Failed to save signing key: ${error.message}`)
  }
}

async function signReleaseFiles(
  releaseFiles: any,
  releaseDir: string,
  signingKey: string,
  alias: string,
  keyStorePassword: string,
  keyPassword: string
): Promise<string[]> {
  const signedReleaseFiles: string[] = []
  let index = 0

  for (const releaseFile of releaseFiles) {
    core.debug(`Found release to sign: ${releaseFile.name}`)
    const releaseFilePath = path.join(releaseDir, releaseFile.name)
    let signedReleaseFile = ''

    console.log('::group::Working on', releaseFile.name, '...')

    try {
      if (releaseFile.name.endsWith('.apk')) {
        signedReleaseFile = await signApkFile(
          releaseFilePath,
          signingKey,
          alias,
          keyStorePassword,
          keyPassword
        )
      } else if (releaseFile.name.endsWith('.aab')) {
        signedReleaseFile = await signAabFile(
          releaseFilePath,
          signingKey,
          alias,
          keyStorePassword,
          keyPassword
        )
      } else {
        throw new Error(`Unsupported file format: ${releaseFile.name}`)
      }
    } catch (error: any) {
      throw new Error(
        `Failed to sign file ${releaseFile.name}: ${error.message}`
      )
    } finally {
      console.log('::endgroup::')
    }

    core.exportVariable(`ANDROID_SIGNED_FILE_${index}`, signedReleaseFile)
    core.setOutput(`signedFile${index}`, signedReleaseFile)
    signedReleaseFiles.push(signedReleaseFile)
    index++
  }

  return signedReleaseFiles
}

function setOutputVariables(signedReleaseFiles: string[]): void {
  core.exportVariable('ANDROID_SIGNED_FILES', signedReleaseFiles.join(':'))
  core.setOutput('signedFiles', signedReleaseFiles.join(':'))
  core.exportVariable(
    'ANDROID_SIGNED_FILES_COUNT',
    `${signedReleaseFiles.length}`
  )
  core.setOutput('signedFilesCount', `${signedReleaseFiles.length}`)

  if (signedReleaseFiles.length === 1) {
    core.exportVariable('ANDROID_SIGNED_FILE', signedReleaseFiles[0])
    core.setOutput('signedFile', signedReleaseFiles[0])
  }
}

function handleError(error: unknown): void {
  if (error instanceof Error) {
    core.setFailed(error.message)
  } else {
    core.setFailed('An unknown error occurred.')
    console.error(error)
  }
}

run()
