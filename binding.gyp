{

  "targets": [
    {
      "target_name": "ndi_receiver",
      "sources": [
        "native/src/ndi_receiver/ndi_receiver.cc"
      ],
      "include_dirs": [
        "<!@(node -p \"require('node-addon-api').include\")",
        "native/include"
      ],
      "libraries": [
        "libavcodec.a"
      ],
      "link_settings": {
        "library_dirs":[
          "native/lib"
        ]
      },
    }
  ]
}