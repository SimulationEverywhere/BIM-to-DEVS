#!/bin/python3

import sys
import json


cell_table = [
    {"counter": -1, "concentration": 500, "type": -100}, # 0b000 air
    {"counter": -1, "concentration": 0,   "type": -300}, # 0b001 wall
    {"counter": -1, "concentration": 500, "type": -500}, # 0b010 window
    2, # 0b011 wall and window, make it a window
    {"counter": -1, "concentration": 500, "type": -500}, # 0b100 door
    4, # 0b101 door and wall, make it a door
    4, # 0b110 door and window, make it a door
    4  # 0b111 door, window, and wall, make it a door
    ]

def state_lookup(cell):
    if type(cell_table[cell]) is int:
        return state_lookup(cell_table[cell])
    else:
        return cell_table[cell]

def main(in_file, out_file):
    dense = json.load(in_file)
    print('{"scenario":', file=out_file)
    print(json.dumps({
            "shape": dense["len"],
            "wrapped": False,
            "default_delay": "transport",
            "default_cell_type": "CO2_cell",
            "default_state": state_lookup(0),
            "default_config": {
                "CO2_cell": {
                    "conc_increase": 243.2,
                    "base": 500,
                    "resp_time": 5,
                    "window_conc": 400,
                    "vent_conc": 300
                }
            },
            "neighborhood": [
                {
                    "type": "von_neumann",
                    "range": 1
                }
            ]
        }, indent=4), end='', file=out_file)
    print(',\n"cells": [', file=out_file)
    comma = False
    for x, plane in enumerate(dense['cells']):
        for y, line in enumerate(plane):
            for z, cell in enumerate(line):
                if(cell):
                    if comma:
                        print(',', file=out_file)
                    else:
                        comma = True
                    print(json.dumps({'cell_id':[x, y, x], 'state':state_lookup(cell)}), end = '', file=out_file)


    print(']}', file=out_file)

if(len(sys.argv) >2):
    with open(sys.argv[1]) as in_file, open(sys.argv[2], 'w') as out_file:
       main(in_file, out_file)
elif len(sys.argv) >1:
    with open(sys.argv[1]) as in_file:
        main(in_file, sys.stdout)
else:
    main(sys.stdin, sys.stdout)
