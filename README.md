<div align="center">
<h1>Sign Android Release</h1>
<p>A GitHub action to sign an APK or AAB.</p>

[![Test](https://github.com/NoCrypt/sign-android/actions/workflows/test.yml/badge.svg)](https://github.com/NoCrypt/sign-android/actions/workflows/test.yml)
[![License](https://img.shields.io/github/license/NoCrypt/sign-android?style=flat-square)](https://github.com/NoCrypt/sign-android/blob/main/LICENSE)

</div>

---

This action will help you sign an Android `.apk` or `.aab` (Android App Bundle)
file for release.

## Usage

```yml
steps:
  - uses: NoCrypt/sign-android@main
    name: Sign app APK
    id: sign_app
    with:
      releaseDir: app/build/outputs/apk/release
      signingKey: ${{ secrets.ANDROID_SIGNING_KEY }}
      keyAlias: ${{ secrets.ANDROID_KEY_ALIAS }}
      keyStorePassword: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
      keyPassword: ${{ secrets.ANDROID_KEY_PASSWORD }}

  # Upload your signed file if you want
  - uses: actions/upload-artifact@v3
    with:
      name: Signed app bundle
      path: ${{steps.sign_app.outputs.signedFile}}
```

If you have multiple files to sign:

```yaml
steps:
  - uses: NoCrypt/sign-android@main
    id: sign_app
    with:
      releaseDir: app/build/outputs/apk/release
      signingKey: ${{ secrets.ANDROID_SIGNING_KEY }}
      keyAlias: ${{ secrets.ANDROID_KEY_ALIAS }}
      keyStorePassword: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
      keyPassword: ${{ secrets.ANDROID_KEY_PASSWORD }}

  - uses: jungwinter/split@v2
    id: signed_files
    with:
      msg: ${{ steps.sign_app.outputs.signedFiles }}
      separator: ':'

  - name: Example Release
    uses: 'marvinpinto/action-automatic-releases@latest'
    with:
      repo_token: '${{ secrets.GITHUB_TOKEN }}'
      automatic_release_tag: 'latest'
      prerelease: true
      title: 'Release X'
      files: |
        ${{ steps.signed_files.outputs._0 }}
        ${{ steps.signed_files.outputs._1 }}
        ${{ steps.signed_files.outputs._2 }}
        ${{ steps.signed_files.outputs._3 }}
        ${{ steps.signed_files.outputs._4 }}
```

Or you can also do this using `signedFileX`:

```yaml
steps:
  - uses: NoCrypt/sign-android@main
    id: sign_app
    with:
      releaseDir: app/build/outputs/apk/release
      signingKey: ${{ secrets.ANDROID_SIGNING_KEY }}
      keyAlias: ${{ secrets.ANDROID_KEY_ALIAS }}
      keyStorePassword: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
      keyPassword: ${{ secrets.ANDROID_KEY_PASSWORD }}

  - name: Example Release
    uses: 'marvinpinto/action-automatic-releases@latest'
    with:
      repo_token: '${{ secrets.GITHUB_TOKEN }}'
      automatic_release_tag: 'latest'
      prerelease: true
      title: 'Release X'
      files: |
        ${{ steps.sign_app.outputs.signedFile0 }}
        ${{ steps.sign_app.outputs.signedFile1 }}
        ${{ steps.sign_app.outputs.signedFile2 }}
        ${{ steps.sign_app.outputs.signedFile3 }}
        ${{ steps.sign_app.outputs.signedFile4 }}
```

## Inputs

You can set either inputs (in `with` section) or env (in `env` section).

| Key               | ENV                         | Usage                                                                                                                                                        |
| ----------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| releaseDir        | ANDROID_RELEASE_DIR         | **Required.** The relative directory path in your project where your Android release file will be located.<br />Defaults to `app/build/outputs/apk/release`. |
| signingKey        | ANDROID_SIGNING_KEY         | **Required.** The base64 encoded signing key used to sign your app.                                                                                          |
| keyAlias          | ANDROID_KEY_ALIAS           | **Required.** The alias of your signing key.                                                                                                                 |
| keyStorePassword  | ANDROID_KEYSTORE_PASSWORD   | **Required.** The password for your signing keystore.                                                                                                        |
| keyPassword       | ANDROID_KEY_PASSWORD        | **Optional.** The private password for your signing key.                                                                                                     |
| buildToolsVersion | ANDROID_BUILD_TOOLS_VERSION | **Optional.** The version of Android build tools to use. Defaults to Auto Detect.                                                                            |
| appName           | ANDROID_APP_NAME            | **Optional.** Prefered App Name for renaming. Defaults to `app`. Example: `name` will results android-`name`-1.2.3.apk                                       |
| appVersion        | ANDROID_APP_VERSION         | **Optional.** Prefered App Version for renaming. Example: `1.2.3` will results android-name-`1.2.3`.apk                                                      |
| appPrefix         | ANDROID_APP_PREFIX          | **Optional.** Prefered App Prefix for renaming. Example: `android` will results `android`-name-1.2.3.apk                                                     |

You can prepare your `signingKey` by running this command:

```sh
openssl base64 < some_signing_key.jks | tr -d '\n' | tee some_signing_key.jks.base64.txt
```

Then copy the text to `Settings - Secrets - Action` in your account or
organization.

## Outputs

| Key              | ENV                        | Usage                                                                                                                                                                          |
| ---------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| signedFile       | ANDROID_SIGNED_FILE        | The path to the single release file that have been signed.<br />Not set if multiple release files have been signed.                                                            |
| signedFiles      | ANDROID_SIGNED_FILES       | The paths to the release files that have been signed with this action, separated by `:`.                                                                                       |
| signedFileX      | ANDROID_SIGNED_FILE_X      | The paths to the release files that have been signed with this action. The `X` is index number starting from 0. Example: `signedFile0, signedFile1` or `ANDROID_SIGNED_FILE_0` |
| signedFilesCount | ANDROID_SIGNED_FILES_COUNT | The count of signed release files.                                                                                                                                             |

## BUGs & Issues

Feel free to [open issues](https://github.com/NoCrypt/sign-android/issues/new).

## Contributions

PRs are welcome! Feel free to contribute.

## LICENSE

[MIT](https://github.com/NoCrypt/sign-android/blob/main/LICENSE)
