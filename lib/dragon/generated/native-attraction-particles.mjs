// Source IncubatorEntity.prefab particle velocity curves and transforms.
export const NATIVE_ATTRACTION_PARTICLES={
  "prefabSha256": "ac31b739f3215c31eaca0105776eaf071c3c1785268e9e5107a08508080442f9",
  "emitters": [
    {
      "name": "ParticlesRegion",
      "sourceParticle": "198433013960508438",
      "pose": {
        "x": -3.37,
        "y": -2.25,
        "z": -0.1,
        "basis": [
          0.9999999999999847,
          1.7484556e-7,
          0,
          -1.7484556e-7,
          0.9999999999999847,
          0,
          0,
          0,
          1
        ]
      },
      "delay": 0,
      "rate": 0.6,
      "lifetime": 0.75,
      "size": 0.5,
      "sizeY": 0.25,
      "speedModifier": 1.2,
      "head": {
        "texture": "Head1.webp",
        "shader": "Mobile/Particles/Alpha Blended",
        "ignoredMaterialTint": [
          0,
          0.8982549,
          1,
          1
        ],
        "color": [
          0,
          0.9884035,
          1,
          1
        ],
        "initialRotation": 0,
        "rotation": {
          "mode": 1,
          "scalar": 1.5707963,
          "keys": [
            {
              "time": 0,
              "value": 0,
              "inSlope": 0,
              "outSlope": 0
            },
            {
              "time": 0.125,
              "value": 1,
              "inSlope": 0,
              "outSlope": 0
            },
            {
              "time": 0.25,
              "value": 0,
              "inSlope": -7.977362,
              "outSlope": -7.977362
            },
            {
              "time": 0.5,
              "value": -1,
              "inSlope": 0,
              "outSlope": 0
            },
            {
              "time": 0.75,
              "value": 0,
              "inSlope": 7.987558,
              "outSlope": 7.987558
            },
            {
              "time": 0.875,
              "value": 1,
              "inSlope": 0,
              "outSlope": 0
            },
            {
              "time": 1,
              "value": 0,
              "inSlope": 0,
              "outSlope": 0
            }
          ]
        }
      },
      "color": {
        "keys": [
          [
            1,
            1,
            1,
            1
          ],
          [
            1,
            1,
            1,
            1
          ],
          [
            0,
            0,
            0,
            0
          ]
        ],
        "colors": [
          0,
          1
        ],
        "alphas": [
          0,
          0.8399938963912413,
          1
        ]
      },
      "velocity": {
        "x": {
          "mode": 1,
          "scalar": 4,
          "keys": [
            {
              "time": 0,
              "value": 1,
              "inSlope": 0,
              "outSlope": 0
            },
            {
              "time": 1,
              "value": 1,
              "inSlope": 0,
              "outSlope": 0
            }
          ]
        },
        "y": {
          "mode": 1,
          "scalar": 1,
          "keys": [
            {
              "time": 0,
              "value": 0,
              "inSlope": 0,
              "outSlope": 0
            },
            {
              "time": 0.25,
              "value": 1,
              "inSlope": 0,
              "outSlope": 0
            },
            {
              "time": 0.75,
              "value": -1,
              "inSlope": 0,
              "outSlope": 0
            },
            {
              "time": 1,
              "value": 0,
              "inSlope": 0,
              "outSlope": 0
            }
          ]
        },
        "z": {
          "mode": 1,
          "scalar": 1,
          "keys": [
            {
              "time": 0,
              "value": 0,
              "inSlope": 0,
              "outSlope": 0
            },
            {
              "time": 1,
              "value": 0,
              "inSlope": 0,
              "outSlope": 0
            }
          ]
        }
      },
      "shape": {
        "position": {
          "x": 0,
          "y": 0,
          "z": 0
        },
        "scale": {
          "x": 1,
          "y": 1,
          "z": 1
        },
        "radius": 0.0001
      },
      "trail": {
        "lifetime": 0.9,
        "widthMultiplier": 0.7,
        "textureMode": 4,
        "textureScale": {
          "x": 0.25,
          "y": 0.5
        },
        "sizeAffectsWidth": true,
        "inheritParticleColor": false,
        "colorOverLifetime": {
          "keys": [
            [
              1,
              1,
              1,
              1
            ],
            [
              1,
              1,
              1,
              1
            ],
            [
              0,
              0,
              0,
              0
            ]
          ],
          "colors": [
            0,
            1
          ],
          "alphas": [
            0,
            0.8,
            1
          ]
        },
        "dieWithParticles": true,
        "sizeAffectsLifetime": false
      }
    },
    {
      "name": "ParticlesSize",
      "sourceParticle": "198592664909728774",
      "pose": {
        "x": 0,
        "y": -4.5,
        "z": -0.1,
        "basis": [
          0.9999999999999847,
          1.7484556e-7,
          0,
          -1.7484556e-7,
          0.9999999999999847,
          0,
          0,
          0,
          1
        ]
      },
      "delay": 0.5,
      "rate": 0.6,
      "lifetime": 0.75,
      "size": 0.25,
      "sizeY": 0.5,
      "speedModifier": 1.5,
      "head": {
        "texture": "Head2.webp",
        "shader": "Mobile/Particles/Alpha Blended",
        "ignoredMaterialTint": [
          0,
          0.8982549,
          1,
          1
        ],
        "color": [
          0,
          0.9884035,
          1,
          1
        ],
        "initialRotation": 0,
        "rotation": {
          "mode": 1,
          "scalar": 0.7853981,
          "keys": [
            {
              "time": 0,
              "value": 0,
              "inSlope": 0,
              "outSlope": 0
            },
            {
              "time": 0.125,
              "value": 1,
              "inSlope": 0,
              "outSlope": 0
            },
            {
              "time": 0.25,
              "value": 0,
              "inSlope": -7.977362,
              "outSlope": -7.977362
            },
            {
              "time": 0.5,
              "value": -1,
              "inSlope": 0,
              "outSlope": 0
            },
            {
              "time": 0.75,
              "value": 0,
              "inSlope": 7.987558,
              "outSlope": 7.987558
            },
            {
              "time": 0.875,
              "value": 1,
              "inSlope": 0,
              "outSlope": 0
            },
            {
              "time": 1,
              "value": 0,
              "inSlope": 0,
              "outSlope": 0
            }
          ]
        }
      },
      "color": {
        "keys": [
          [
            1,
            1,
            1,
            1
          ],
          [
            1,
            1,
            1,
            1
          ],
          [
            0,
            0,
            0,
            0
          ]
        ],
        "colors": [
          0,
          1
        ],
        "alphas": [
          0,
          0.8399938963912413,
          1
        ]
      },
      "velocity": {
        "x": {
          "mode": 1,
          "scalar": 0.5,
          "keys": [
            {
              "time": 0,
              "value": 0,
              "inSlope": 0,
              "outSlope": 0
            },
            {
              "time": 0.25,
              "value": 1,
              "inSlope": 0,
              "outSlope": 0
            },
            {
              "time": 0.75,
              "value": -1,
              "inSlope": 0,
              "outSlope": 0
            },
            {
              "time": 1,
              "value": 0,
              "inSlope": 0,
              "outSlope": 0
            }
          ]
        },
        "y": {
          "mode": 1,
          "scalar": 2,
          "keys": [
            {
              "time": 0,
              "value": 1,
              "inSlope": 0,
              "outSlope": 0
            },
            {
              "time": 1,
              "value": 1,
              "inSlope": 0,
              "outSlope": 0
            }
          ]
        },
        "z": {
          "mode": 1,
          "scalar": 1,
          "keys": [
            {
              "time": 0,
              "value": 0,
              "inSlope": 0,
              "outSlope": 0
            },
            {
              "time": 1,
              "value": 0,
              "inSlope": 0,
              "outSlope": 0
            }
          ]
        }
      },
      "shape": {
        "position": {
          "x": 0,
          "y": 0,
          "z": 0
        },
        "scale": {
          "x": 1,
          "y": 1,
          "z": 1
        },
        "radius": 0.0001
      },
      "trail": {
        "lifetime": 0.9,
        "widthMultiplier": 0.7,
        "textureMode": 4,
        "textureScale": {
          "x": 0.25,
          "y": 0.5
        },
        "sizeAffectsWidth": true,
        "inheritParticleColor": false,
        "colorOverLifetime": {
          "keys": [
            [
              1,
              1,
              1,
              1
            ],
            [
              1,
              1,
              1,
              1
            ],
            [
              0,
              0,
              0,
              0
            ]
          ],
          "colors": [
            0,
            1
          ],
          "alphas": [
            0,
            0.8,
            1
          ]
        },
        "dieWithParticles": true,
        "sizeAffectsLifetime": false
      }
    },
    {
      "name": "ParticlesRarity",
      "sourceParticle": "198817325062191328",
      "pose": {
        "x": 3.54,
        "y": -2.25,
        "z": -0.1,
        "basis": [
          0.9999999999999847,
          1.7484556e-7,
          0,
          -1.7484556e-7,
          0.9999999999999847,
          0,
          0,
          0,
          1
        ]
      },
      "delay": 1.3,
      "rate": 0.6,
      "lifetime": 0.75,
      "size": 0.5,
      "sizeY": 0.25,
      "speedModifier": -1.2,
      "head": {
        "texture": "Head3.webp",
        "shader": "Mobile/Particles/Alpha Blended",
        "ignoredMaterialTint": [
          0,
          0.8982549,
          1,
          1
        ],
        "color": [
          0,
          0.9884035,
          1,
          1
        ],
        "initialRotation": 0,
        "rotation": {
          "mode": 1,
          "scalar": 1.5707963,
          "keys": [
            {
              "time": 0,
              "value": 0,
              "inSlope": 0,
              "outSlope": 0
            },
            {
              "time": 0.125,
              "value": 1,
              "inSlope": 0,
              "outSlope": 0
            },
            {
              "time": 0.25,
              "value": 0,
              "inSlope": -7.977362,
              "outSlope": -7.977362
            },
            {
              "time": 0.5,
              "value": -1,
              "inSlope": 0,
              "outSlope": 0
            },
            {
              "time": 0.75,
              "value": 0,
              "inSlope": 7.987558,
              "outSlope": 7.987558
            },
            {
              "time": 0.875,
              "value": 1,
              "inSlope": 0,
              "outSlope": 0
            },
            {
              "time": 1,
              "value": 0,
              "inSlope": 0,
              "outSlope": 0
            }
          ]
        }
      },
      "color": {
        "keys": [
          [
            1,
            1,
            1,
            1
          ],
          [
            1,
            1,
            1,
            1
          ],
          [
            0,
            0,
            0,
            0
          ]
        ],
        "colors": [
          0,
          1
        ],
        "alphas": [
          0,
          0.8399938963912413,
          1
        ]
      },
      "velocity": {
        "x": {
          "mode": 1,
          "scalar": 4,
          "keys": [
            {
              "time": 0,
              "value": 1,
              "inSlope": 0,
              "outSlope": 0
            },
            {
              "time": 1,
              "value": 1,
              "inSlope": 0,
              "outSlope": 0
            }
          ]
        },
        "y": {
          "mode": 1,
          "scalar": 1,
          "keys": [
            {
              "time": 0,
              "value": 0,
              "inSlope": 0,
              "outSlope": 0
            },
            {
              "time": 0.25,
              "value": 1,
              "inSlope": 0,
              "outSlope": 0
            },
            {
              "time": 0.75,
              "value": -1,
              "inSlope": 0,
              "outSlope": 0
            },
            {
              "time": 1,
              "value": 0,
              "inSlope": 0,
              "outSlope": 0
            }
          ]
        },
        "z": {
          "mode": 1,
          "scalar": 1,
          "keys": [
            {
              "time": 0,
              "value": 0,
              "inSlope": 0,
              "outSlope": 0
            },
            {
              "time": 1,
              "value": 0,
              "inSlope": 0,
              "outSlope": 0
            }
          ]
        }
      },
      "shape": {
        "position": {
          "x": 0,
          "y": 0,
          "z": 0
        },
        "scale": {
          "x": 1,
          "y": 1,
          "z": 1
        },
        "radius": 0.0001
      },
      "trail": {
        "lifetime": 0.9,
        "widthMultiplier": 0.7,
        "textureMode": 4,
        "textureScale": {
          "x": 0.25,
          "y": 0.5
        },
        "sizeAffectsWidth": true,
        "inheritParticleColor": false,
        "colorOverLifetime": {
          "keys": [
            [
              1,
              1,
              1,
              1
            ],
            [
              1,
              1,
              1,
              1
            ],
            [
              0,
              0,
              0,
              0
            ]
          ],
          "colors": [
            0,
            1
          ],
          "alphas": [
            0,
            0.8,
            1
          ]
        },
        "dieWithParticles": true,
        "sizeAffectsLifetime": false
      }
    }
  ]
};
