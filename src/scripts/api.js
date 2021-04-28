const express = require('express')
const path = require('path')

export class API {
    getViewer = this.getViewer.bind(this)
    listClips = this.listClips.bind(this)
    getClip = this.getClip.bind(this)

    constructor(port, resolve) {
        this.resolve = resolve
        this.port = port
        this.app = express()
        this.clips = []

        this.initializeApp()
    }

    startServer() {
        return new Promise(resolve => this.app.listen(this.port, resolve))
    }

    enqueueClips(clips) {
        this.clips = [...clips]
    }

    initializeApp() {
        const { app } = this
        app.use(express.static(path.resolve(__dirname, 'viewer')))
        app.get('/', this.getViewer)
        app.get('/clips', this.listClips)
        app.get('/clips/:name', this.getClip)
        app.set('view engine', 'ejs')
        app.set('views', path.join(__dirname, '/views'));
    }

    getViewer(req, res) {
        const clips = JSON.stringify(this.clips)
        res.render('viewer', { clips })
    }

    listClips(req, res) {
        res.send(this.clips)
    }

    getClip(req, res) {
        const { name } = req.params
        res.sendFile(this.resolve(name))
    }
}

