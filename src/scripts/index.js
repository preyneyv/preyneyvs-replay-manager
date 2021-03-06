import { API } from "./api.js"

const $ = require('jquery')
const chokidar = require('chokidar')
const fs = require('fs')
const path = require('path')

const $configDirectory = $("#configuration-directory"),
    $configPort = $("#configuration-port"),
    $configPattern = $("#configuration-pattern"),
    $configTags = $("#configuration-tags"),
    $hideAll = $("#hide-all"),
    $showAll = $("#show-all"),
    $copyURL = $("#copy-url"),
    $selectionStatus = $("#selection-status"),
    $loopPlaylist = $("#loop-playlist"),
    $clearSelection = $("#clear-selection"),
    $enqueueSelection = $("#enqueue-selection"),
    $replayClipScroller = $("#replay-clips-scroller"),
    $replayClips = $("#replay-clips tbody"),
    $replayClipSelector = $("#replay-clips-selector")

const config = localStorage.config ? JSON.parse(localStorage.config) : {
    directory: '',
    port: '',
    pattern: '',
    tags: []
}

let fileMatchPattern;
let api;

let clips = [], hidden = [];

$configDirectory.val(config.directory)
$configPort.val(config.port)
$configPattern.val(config.pattern)
$configTags.val(config.tags.join(','))

$("#title").on('click', () => {
    if (!confirm("Are you sure you want to go back to the settings?"))
        return
    window.location.reload()
})

$("#configuration-form").on('submit', submitConfiguration)

function submitConfiguration(e) {
    if (e) {
        e.preventDefault()
        e.stopPropagation()
    }

    try {
        fileMatchPattern = new RegExp($configPattern.val())
    } catch (e) {
        alert('You have provided an invalid pattern. Make sure it is a valid Regular Expression!')
        console.error(e)
        return
    }

    config.directory = $configDirectory.val()
    config.port = $configPort.val()
    config.pattern = $configPattern.val()
    config.tags = $configTags.val().split(',').map(s => s.trim()).filter(s => s).slice(0, 5)

    localStorage.config = JSON.stringify(config)

    startManager().then(() => $("#configuration-popup").addClass('hide'));
}


function fetchListing() {
    const clipNames = clips.map(clip => clip.name).concat(hidden)
    fs.readdir(config.directory, (e, files) => {
        if (e) {
            alert("Couldn't read files in the provided directory! Please check the path!")
            window.location.reload()
        }
        files = files
            .filter(name => !clipNames.includes(name))
            .filter(name => fileMatchPattern.test(name))
            .map(name => ({
                name: name,
                time: fs.statSync(path.join(config.directory, name)).mtime.getTime()
            }))
            .sort((a, b) => a.time - b.time)
            .map(v => v.name)
            .map(name => ({
                name, tags: [], checked: false, $row: null
            }))
        clips.push(...files)

        updateUI()
    })
}

function makeTagOptions(clip) {
    return config.tags.map((name, i) => $("<span>")
        .addClass('tag')
        .addClass('deselected')
        .addClass(`tag-${i}`)
        .text(name)
        .on('click', function (e) {
            e.stopPropagation()
            if (clip.tags.includes(i)) {
                // remove it
                clip.tags = clip.tags.filter(tag => tag !== i)
                $(this).addClass('deselected')
            } else {
                $(this).removeClass('deselected')
                clip.tags.push(i)
            }
        }))
}

function makeHideButton(clip) {
    const $button = $("<button>").text('Hide')
    $button.on('click', (e) => {
        e.stopPropagation()
        if (!confirm('Are you sure you want to hide this clip?'))
            return
        hidden.push(clip.name)
        updateUI()
    })
    return $button
}

function makeRow(clip) {
    const $row = $("<tr>")
    $row
        .append($("<td>")
            .append($("<input class='clip-checked'>")
                .attr('type', 'checkbox')
                // .on('change', (e) => {
                    // clip.checked = e.target.checked
                    // updateUI()
                // })
            )
        )
        .append($("<td class='clip-name'>")
            .append($('<span>').text(clip.name))
            .attr('title', clip.name)
            // .on('click', () => $row.find('.clip-checked').click()))
        )
        .append($("<td class='clip-tags'>")
            .append(makeTagOptions(clip))
        )
        .append($("<td class='clip-actions'>")
            // .append(makeTagSelector(clip))
            .append(makeHideButton(clip))
        )
    $row.on('click', () => {
        clip.checked = !clip.checked
        updateUI()
    })
    return $row
}

function updateUI() {
    for (const clip of clips) {
        if (hidden.includes(clip.name)) {
            // should delete the thing
            clip.$row && clip.$row.remove()
            clip.$row = null
            continue
        }
        if (clip.$row === null) {
            // should create the thing
            $replayClips.append(clip.$row = makeRow(clip))
            $replayClipScroller.scrollTop($replayClipScroller[0].scrollHeight);
        } else {
            clip.$row
                .toggleClass('selected', clip.checked)
                .find('.clip-checked').prop('checked', clip.checked)
        }
    }

    clips = clips.filter(clip => !!clip.$row)
    const selectedCount = clips.filter(clip => clip.checked).length
    $selectionStatus.text(`${selectedCount} clip${selectedCount === 1 ? '' : 's'} selected.`)
}

function hideAllClips() {
    if (!confirm('Are you sure you want to hide all clips?'))
        return
    hidden.push(...clips.map(clip => clip.name))
    updateUI()
}

function showAllClips() {
    if (!confirm('Are you sure you want to reveal all clips?'))
        return
    hidden.push(...clips.map(clip => clip.name))
    updateUI()
    hidden = []
    fetchListing()
}

function copyURL() {
    const url = `http://localhost:${config.port}`
    navigator.clipboard.writeText(url).then(() => $selectionStatus.text('Copied Viewer URL to clipboard!'))
}

function enqueuePlaylist() {
    const playlist = clips
        .filter(c => c.checked)
        .map(c => c.name)
    api.enqueueClips(playlist, $loopPlaylist.prop('checked'))
    $selectionStatus.text('Playlist updated successfully.')
}

async function startManager() {
    $hideAll.on('click', hideAllClips)
    $showAll.on('click', showAllClips)
    $copyURL.on('click', copyURL)

    $replayClipSelector
        .append($("<span class='tag'>").addClass(`tag-neutral`).text('All').on('click', () => {
            // select all clips
            clips.map(clip => clip.checked = true)
            updateUI()
        }))
        .append($("<span class='tag'>").addClass(`tag-neutral`).text('None').on('click', () => {
            // deselect all clips
            clips.map(clip => clip.checked = false)
            updateUI()
        }))
        .append(config.tags.map((tag, i) => $("<span class='tag'>").addClass(`tag-${i}`).text(tag).on('click', () => {
            // select all clips with specific tag
            clips.map(clip => clip.checked = clip.tags.includes(i))
            updateUI()
        })))

    $clearSelection.on('click', () => {
        clips.map(clip => clip.checked = false)
        updateUI()
    })
    $enqueueSelection.on('click', () => enqueuePlaylist())

    // Watch the target folder.
    chokidar
        .watch(config.directory.replace(/\\/g, '/'))
        .on('add', () => fetchListing())

    // Start the viewer API
    api = new API(config.port, name => path.join(config.directory, name))
    await api.startServer()

    // Do the initial setup.
    fetchListing()
    enqueuePlaylist()
}
