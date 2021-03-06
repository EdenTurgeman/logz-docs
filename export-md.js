console.clear()
const path = require('path')
const fs = require('fs-extra')

console.group('Getting started...')

// Set the output formats we want to use
const outputFormats = [ 'GFM' , 'CONTENTFUL' ]

// Set the folders this script runs on
const collectionsFolder
  = path.join(__dirname, '_source/logzio_collections')
const markdownFolders
  = [ '_log-sources' , '_metrics-sources', '_shippers' ]

let sourceFolderPaths = []
markdownFolders.forEach(folder =>
  sourceFolderPaths.push(path.join(collectionsFolder, folder))
)

// Set the output folder
const parentOutputFolder
  = path.join(__dirname, '_export-md')
fs.emptydirSync(parentOutputFolder) // Clean or create the output folder

console.info({outputFormats, collectionsFolder, markdownFolders, sourceFolderPaths, parentOutputFolder})

console.groupEnd()

// This will feed the output folder when it's populated
let sourceContent = {}

// Build sourceContent structure
sourceContent = addFoldersToSourceContentArr(sourceContent)

// Add source content to the array
sourceContent = buildSourceContentArr(sourceContent)

console.log({parentOutputFolder, outputFormats})

makeOutputSubfolders()

Object.keys(sourceContent).forEach(folder =>
  generateMdOutput(folder)
)

allDone() // close the program

/**
 * Splitting everything into functions, making the code readable
 */

// When it's time to end
function allDone() {
  console.log('Done.')
  process.exit(0)
}

function addFoldersToSourceContentArr(sourceContent) {
  markdownFolders.forEach(folder => {
    sourceContent[folder] = []
  })
  return sourceContent
}

// Build the sourceContent array for each collection
function buildSourceContentArr(sourceContent) {
  markdownFolders.forEach(folder => {
    console.group()
    let sourceFolder = path.join(collectionsFolder, folder)
    console.log(`Working on ${sourceFolder} ...`)
    // Collect the filenames in an array
    let filenames = fs.readdirSync(sourceFolder)
    filenames.forEach(file => {
      let filepath = path.join(sourceFolder, file)
      let contents = fs.readFileSync(filepath, {encoding: 'utf-8'})
      sourceContent[folder].push({filename: file, contents: contents})
    })
    console.groupEnd()
  })

  return sourceContent
}

// Make the output subfolders under the main output folder
function makeOutputSubfolders() {
  markdownFolders.forEach(subfolder =>
    fs.mkdirSync(path.join(parentOutputFolder, subfolder))
  )
}

function generateMdOutput(folder) {
  outputFormats.forEach(format => {
    let thisFolder = ''.concat(parentOutputFolder, '/', folder)
    console.log({format, thisFolder})
    sourceContent[folder].forEach(file => {
      // Get filename, sans extension
      let base = path.parse(file.filename).name

      // Append format to filename
      let newFilename = ''.concat(base, '__', format, '.md')

      // Set vars for creating the files
      let filepath = path.join(thisFolder, newFilename)

      // Run the regex
      let data = replaceText(file.contents, format)

      // Create the file in the output subfolder, populate with data
      fs.writeFileSync(filepath, data)
    })
  })
}


/**
 * The fun stuff, regex
 */

function replaceText(data, mdFormat) {
  data = data
    // remove frontmatter
    .replace(/(---[\s\S]+?---(\n){1})/, source =>
      '# ' + source.match(/(?<=^title: ).+$/m) + '\n')

    // remove image classes .override.btn-img
    .replace(/{:.override.btn-img}(\n?)/g, '')

    // clean up the tasklist, add numbers
    .replace(/((?<=^#{5} ).+$|^<div class="tasklist">$)/gm, source => {
      switch (source) {
        case '<div class="tasklist">':
          taskStepNum = 0
          return source
        default:
          taskStepNum++
          return taskStepNum + '. ' + source
        }
    })

    // convert deflists to table by removing .paramlist class
    .replace(/{:.paramlist}\n/g, '')

    // reformat info-boxes
    .replace(/(?<=\n{2})(?:^.+\n)+?\{:\.info-box\.\b(.+)\b\}/gm, source => {
      let className = source.match(/(?<=:\.info-box\.).*(?=})/g).toString()
      let bodyText = source.replace(/\n\s*{:.*}/, '')

      switch (className) {
        case 'note':
          title = "Note"
          break
        case 'important':
          title = "Important"
          break
        case 'warning':
          title = "Warning"
          break
        case 'tip':
          title = "Pro tip"
          break
        case 'read':
          title = "Read more"
          break
      };

      return '**' + title + '**:\n' + bodyText
    })

    // replace .required-param and .default-param with content
    .replace(/<span.*required-param.*\/span>/g, '(Required)')
    .replace(/<span.*default-param.*\/span>/g, source => '(Default: ' + source.replace(/<(\/*)span.*?>/g, '') + ')'
    )

    // convert EOL \\ to html <br>
    .replace(/\\{2}/g, '<br>')

    // convert site.baseurl to absolute url
    .replace(/{{site.baseurl}}/g, 'https://docs.logz.io')

    if (mdFormat === 'GFM') {
      data = data
        // replace jekyll includes
        .replace(/{%.*replace-vars.*token=true.*%}( \\\\)?/g, 'Replace `<<SHIPPING-TOKEN>>` with the [token](https://app.logz.io/#/dashboard/settings/general) of the account you want to ship to.')
        .replace(/{%.*replace-vars.*listener=true.*%}( \\\\)?/g, 'Replace `<<LISTENER-HOST>>` with your region\'s listener host (for example, `listener.logz.io`). For more information on finding your account\'s region, see [Account region](https://docs.logz.io/user-guide/accounts/account-region.html).')
    }

  if (mdFormat === 'CONTENTFUL') {
    data = data
      .replace(/<br>(\n|\s)/g, ' ')
      .replace(/(?<=```).+$/gm, '')
      .replace(/`([^`].*?)`/g, '\'$1\'')
      .replace(/\{%(.+)?%\}(\s|\n?)/g, '')
      .replace(/<!--(.+)-->(\n|\s?)/g, (source) => {
        let theresAMatch = false
        const commentsToRemove = [
           'tab:'
         , 'tabContainer:'
         , 'logzio-inject:'
        ]

        commentsToRemove.forEach(str => {
          if (source.match(str)) theresAMatch = true
        })

        return theresAMatch === true ? '' : source
      })
      .replace(/<(\/|)details>\n{2}/g, '')
      .replace(/<(\/|)summary>\n/g, source => source === '<summary>\n' ? '###### ' : '')
      .replace(/<<SHIPPING-TOKEN>>/g, '{{API_TOKEN}}')
      .replace(/<<LISTENER-HOST>>/g, '{{LOGZ_LISTENER}}')
      .replace(/\n<div class=".+">\n/g, '')
      .replace(/<div id=".+-config">/g, '----')
      .replace(/\n<\/div>(\n|)/g, '')
  }

  // Replace too many line breaks with just enough line breaks.
  data = data
    .replace(/\n{3,}/g, '\n\n')

  return data
}
