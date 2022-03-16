const D3CONS = {
  // node的状态
  eNodeStatus: {
    normal: 1,
    select: 2,
    subSelect: 4
  },

  ccStokeWidth: {
    selected: 3.0,
    normal: 1.0
  },
  nodeStokeWidth: {
    selected: 1.0,
    normal: 1.0
  },
  nodeOpacity: {
    selected: 1.0,
    normal: 0.2
  },
  node: {
    'node': {
      // type: 'icon',
      status: 1,
      statusOper: {
        1: {
          'root': {
            'opacity': 0.2,
          },
          '.polygon': {
            'transform': 'scale(1.3, 1.3)'
          },
          '.node-edge1': {
            'stroke-width': 0.51
          },
          '.node-edge2': {
            'stroke-width': 0.51
          },
          'text': {
            'font-size': '10px'
          }
        },
        2: {
          'root': {
            'opacity': 1.0,
          },
          '.polygon': {
            'transform': 'scale(1.3, 1.3)'
          },
          '.node-edge1': {
            'stroke-width': 0.6
          },
          '.node-edge2': {
            'stroke-width': 0.6
          },
          'text': {
            'font-size': '12px'
          }
        },
        4: {
          'root': {
            'opacity': 1.0,
          },
          '.polygon': {
            'transform': 'scale(1.6, 1.6)'
          },
          '.node-edge1': {
            'stroke-width': 1.0
          },
          '.node-edge2': {
            'stroke-width': 1.0
          },
          'text': {
            'font-size': '15px'
          }
        }
      }
    },
    'org': {
      // type: 'circle',
      status: 1,
      statusOper: {
        1: {
          'circle': {
             'opacity': 0.2
          },
          'text': {
            'opacity': 0.2,
            'font-size': '10px'
          },
          '.dot': {
            'opacity': 0.0
          }
        },
        2: {
          'circle': {
            'opacity': 0.4,
          },
          'text': {
            'opacity': 0.4,
            'font-size': '12px'
          },
          '.dot': {
            'opacity': 1.0
          }
        },
        4: {
          'circle': {
            'opacity': 0.6
          },
          'text': {
            'opacity': 1.0,
            'font-size': '15px'
          },
          '.dot': {
            'opacity': 0.0
          }
        }
      },
      params: {
        baseRadius: 30 // org的基本半径，乘以org包含的node个数就是实际的半径
      }
    },
    'cc': {
      // type: 'text',
      status: 1,
      statusOper: {
        1: {
          'root': {
            // 'opacity': 0.0,
            'visibility': 'hidden'
          },
          '.cc': {
            'transform': 'scale(1.0, 1.0)'
          }
        },
        2: {
          'root': {
            'opacity': 0.5,
            'visibility': 'visiable'
          },
          '.cc': {
            'transform': 'scale(0.8, 0.8)'
          }
        },
        4: {
          'root': {
            'opacity': 1.0,
            'visibility': 'visiable'
          },
          '.cc': {
            'transform': 'scale(1.2, 1.2)'
          }
        }
      }
    }
  },

  link: {
    'channel': {
      strokeWidth: 2,
      hlStrokeWidth: 3,
      strokeColor: '',
      distance: 200,
      strength: 0.1
    },
    'org-node': {
      strokeWidth: 0,
      hlStrokeWidth: 0,
      strokeColor: '#999',
      distance: 20,
      strength: 1.0
    },
    'node-cc': {
      strokeWidth: 2,
      hlStrokeWidth: 2,
      strokeColor: '#999',
      distance: 50,
      strength: 1.0
    },
    'cc-cc': {
      strokeWidth: 2,
      hlStrokeWidth: 2,
      strokeColor: '#999',
      distance: 10,
      strength: 1.0
    },
    'org-org': {
      strokeWidth: 2,
      hlStrokeWidth: 2,
      strokeColor: '#999',
      strength: 1.0
    }
  }
}

export default D3CONS;