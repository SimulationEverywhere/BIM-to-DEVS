# Derived from: https://github.com/SimulationEverywhere/covid_cell_devs/blob/master/notebooks/epidemic_plots_from_cd_log.ipynb
# Creates the CSV file required for visualization
# Takes Cadmium "state.txt" output file

# sec 1
import os
import re
from collections import defaultdict

# extra
def convertTime (timeStr):
  return "00:00:00:{0}".format(timeStr.zfill(3))

# sec 2
log_filename = "output/state.txt"
dim = 138,91
initial_val = 0
#log_filename = "covid_store.log"
#dim = 64, 100
#initial_val = None
log_state_changes_to_file = True
patt_out_line = ".*\((?P<x>[0-9]+),(?P<y>[0-9]+)\) is \<.*,(?P<state>[0-9]+),(?P<type>-[0-9]+)\>"

#sec 5
state_count = defaultdict(int)
df_rows = []
curr_states = [[initial_val] * dim[1] for _ in range(dim[0])]
if initial_val is not None:
    state_count[initial_val] = dim[0]*dim[1]

# sec 6
if log_state_changes_to_file:
  csv_file = open("state_changing.csv", "w")
  csv_file.write(",".join(("time", "x", "y", "previous_state", "current_state", "type")) + "\n")
curr_time = None

with open(log_filename, "r") as log_file:
  for line in log_file:
    line = line.strip()
    match = re.match(patt_out_line, line)  # parse the current line
    if not match:  # if the current line does not match the regex, treat is as time
      curr_time = line
      continue

    x = int(match.group("x"))
    y = int(match.group("y"))
    
    if not curr_states[x][y] is None:
      state_count[curr_states[x][y]] -= 1

    if log_state_changes_to_file:
      # if the state has changed and the current time is not 0
      if (curr_states[x][y] != int(float(match.group("state"))) and int(curr_time) != 0):
        csv_file.write((",".join((convertTime(curr_time), match.group("x"), match.group("y"), str(curr_states[x][y]), str(int(float(match.group("state")))), str(match.group("type"))))))
        csv_file.write("\n")
    #print("Time: %s, cell (%s, %s) changing from %d to %s" % (match.group("time"), match.group("x"), match.group("y"), curr_states[x][y], match.group("state")))
    curr_states[x][y] = int(float(match.group("state")))
    state_count[int(float(match.group("state")))] += 1

if log_state_changes_to_file:
  csv_file.close()