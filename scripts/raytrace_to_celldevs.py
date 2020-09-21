import json
from math import inf
from typing import List, Tuple


cell_size = (1, 1, 1)       # Dimension for each cell (in this case, each cell is a cubic meter)
default_cell_type = 'Air'   # By default, all cells are of type 'Air'
min_points = 3              # By default, we need at least 3 points inside a cell to reconsider its type

# Default scenario configuration
scenario = {
    'wrapped': False,
    'default_delay': 'inertial',
    'default_cell_type': 'CO2_cell',
    'default_state': {
        'counter': -1,
        'concentration': 500,
        'type': -100,
    },
    'default_config': {
        'CO2_cell': {
            'conc_increase': 143.2,
            'base': 500,
            'resp_time': 5,
            'window_conc': 400,
            'vent_conc': 300,
        }
    },
    'neighborhood': [{'type': 'von_neumann', 'range': 1}]
}

# Dictionary containing all the different cell types and their corresponding value
cell_types = {
    'Air': -100,
    'Wall': -300,
    'Window': -500,
    'Chair': -200,
    'Door': -400,
    'Mechanical Equipmen': -600
}


def get_cell_type(data_in: List[Tuple[str, str]], default_type: str = 'Air', min_points: float = 3) -> int:
    """
    From a tuple of raytraced points within a single cell, this function returns the corresponding cell type

    :param data_in: list with all the points within the cell. Points are a tuple (point_type, object_id)
    :param default_type: Default cell type in case there are not enough points of a different object type.
                         By default, cells are of type "Air"
    :param min_points: Minimum number of points required for a cell to be considered different to the default type.
                       By default, there must be at least 3 points of a different object.
    :return: value corresponding to the type of the cell
    """
    hits = {cell_type: 0 for cell_type in cell_types}
    # We count how many points of each points are in the cell
    for data_type, data_ID in data_in:
        hits[data_type] += 1
    # By default, the cell is of the default type.
    point = default_type
    n_times = min_points
    for data_type, n_hits in hits.items():
        if n_hits >= n_times:
            point = data_type
            n_times = n_hits
    # We return the cell type ID corresponding to the cell
    return cell_types[point]


if __name__ == '__main__':
    # We read the JSON file
    with open('data/raytrace.json') as f:
        raw = json.load(f)
    # We adapt the data to a desired format
    data_biassed = dict()  # {(x,y,z): (type, id)}
    for entry in raw:
        data_biassed[(entry['point']['x'], entry['point']['y'], entry['point']['z'])] = (entry['type'], entry['dbID'])
    # We find out the minimum coordinate for each dimension (x, y, and z)
    origin = tuple(inf for i in range(len(cell_size)))
    for coordinate in data_biassed:
        origin = tuple(min(origin[i], coordinate[i]) for i in range(len(origin)))

    # Now, we apply the offset so all the points have a positive coordinate
    data_unbiassed = dict()
    for coordinate, data in data_biassed.items():
        data_unbiassed[tuple(coordinate[i] - origin[i] for i in range(len(origin)))] = data

    # We go point by point in your data and identify which cell corresponds to
    data_cell = dict()
    for coordinate, data in data_unbiassed.items():
        cell = tuple(int(coordinate[i] // cell_size[i]) for i in range(len(cell_size)))
        if cell not in data_cell:
            data_cell[cell] = list()
        data_cell[cell].append(data)

    # We compute the scenario shape and add it to the scenario configuration
    shape = (0, 0, 0)
    for cell_id in data_cell:
        shape = tuple(max(shape[i], cell_id[i]) for i in range(len(shape)))
    shape = tuple(shape[i] + 1 for i in range(len(shape)))
    scenario['shape'] = shape

    # We add the custom configuration for those cells that have at least one raytraced point
    cells = list()
    for cell_id, data in data_cell.items():
        aux = {
            'cell_id': cell_id,
            'state': {
                'concentration': 500,
                'type': get_cell_type(data),
                'counter': -1,
            },
        }
        cells.append(aux)

    # We store the outcome in a JSON file
    json_file = {
        'scenario': scenario,
        'cells': cells,
    }
    with open('data/celldevs_data.json', 'w') as f:
        json.dump(json_file, f, indent=4)
