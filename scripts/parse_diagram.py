# A script to convert a text representation of a model into the Cadmium input format

import json
import sys

cellInfo = {
    # IMPERMEABLE_STRUCTURE
    "w" : {
        "conc" : 0,
        "type" : -300,
        "counter" : -1
    },
    # WORKSTATION
    "c" : {
        "conc" : 500,
        "type" : -700,
        "counter" : -1
    },
    # VENTILATION
    "v" : {
        "conc" : 300,
        "type" : -600,
        "counter" : -1
    }
}

# File to be parsed
filename = "data/text_model_layer.txt"

# Import file
stringData = ""
with open(filename, "r") as f:
    stringData = f.read()

# Make each line an element in a list
rawData = stringData.split("\n")

# Remove extraneous information
data = []
for line in rawData:
    if (len(line) <= 0):
        continue
    if (line[0] == "y"):
        data.append(line[8:])

# Match Y coordinate labels
data.reverse()

# Make a cell with the given information
def makeCell (coords, concentration, cellType, counter):
    return {
        "cell_id": coords,
        "state" : {
            "concentration" : concentration,
            "type" : cellType,
            "counter" : counter
        }
    }

# Create part of JSON used to configure the simulator
def createHead (length, width):
    data = {
        "scenario" : {
            "shape" : [length, width],
            "wrapped" : False,
            "default_delay" : "transport",
            "default_cell_type" : "CO2_cell",
            "default_state" : {
                "counter": -1,
                "concentration" : 500,
                "type" : -100
            },
        "default_config" : {
                "CO2_cell" : {
                    "conc_increase" : 143.2,
                    "base" : 500,
                    "resp_time" : 5,
                    "window_conc" : 400,
                    "vent_conc" : 300
                }
            },
            "neighborhood": [
                {
                    "type" : "von_neumann",
                    "range" : 1
                }
            ]
        },
        "cells" : []
    }
    return data

# Convert information from the input file into cells
cells = []
for y in range(0, len(data)):
    for x in range(0, len(data[y])):
        currChar = data[y][x].lower()
        if (currChar != " "):
            cells.append(makeCell([x, y], cellInfo[currChar]["conc"], cellInfo[currChar]["type"], cellInfo[currChar]["counter"]))

# Put the two seconds of the JSON together
finalData = createHead(len(data[0]), len(data))
finalData["cells"] = cells

# Convert the Python dictionary representation of the JSON into a string
stringJSON = json.dumps(finalData)

# Write the JSON string to a file
with open("output.json", "w") as f:
    f.write(stringJSON)