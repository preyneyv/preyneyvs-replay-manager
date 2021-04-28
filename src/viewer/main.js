// `clips` is injected server-side.

const videoA = document.querySelector("#video-a"),
    videoB = document.querySelector("#video-b")

let current = videoA,
    standby = videoB

let nextIdx = 0

const clipURL = idx => idx < clips.length ? `/clips/${clips[idx]}` : undefined

function initializeFirstClip() {
    current.src = clipURL(nextIdx++)
    standby.src = clipURL(nextIdx++)
    current.play()
    updateVolumes()
}

function onTimeUpdate(e, elem) {
    if (elem != current)
        return
    
    const remaining = elem.duration - elem.currentTime
    if (remaining <= 1) {
        // Less than one second left, transition!
        initiateSwapVideos()
    }
}

function initiateSwapVideos() {
    [current, standby] = [standby, current]
    swapVideos(50)    
}

function swapVideos(backoff) {
    if (current.readyState != 4) {
        // The video isn't loaded yet. Let's try in a bit.
        if (backoff < 800) {
            setTimeout(() => swapVideos(backoff * 2), backoff)
        }
        // Otherwise, give up.
        return
    }

    standby.classList.remove('show')
    current.classList.remove('hide')
    current.classList.add('show')
    current.play()
    
    setTimeout(() => {
        standby.classList.add('hide')
        standby.src = clipURL(nextIdx++)
    }, 1000)
}

videoA.addEventListener('timeupdate', e => onTimeUpdate(e, videoA))
videoB.addEventListener('timeupdate', e => onTimeUpdate(e, videoB))

function setVideoVolumeBasedOnTime(v) {
    const { currentTime, duration } = v
    const remaining = duration - currentTime
    if (isNaN(duration)) 
        return
    
    // Fade to 1 in the first second and to zero in the last second.
    v.volume = Math.min(1, currentTime, remaining)
}

function updateVolumes() {
    setVideoVolumeBasedOnTime(videoA)
    setVideoVolumeBasedOnTime(videoB)    

    requestAnimationFrame(updateVolumes)
}

initializeFirstClip()

addEventListener('obsSourceActiveChanged', e => {
    // By hiding the body at the end, we prevent an ugly glitch in OBS where it shows the previous browser state for one frame
    if (!e.detail.active)
        document.body.classList.add('hide')
})
