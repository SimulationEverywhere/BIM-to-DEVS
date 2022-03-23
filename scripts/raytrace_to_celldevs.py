from __future__ import annotations
import json
from math import inf


# Dictionary containing all the different BIM object IDs and their corresponding initial cell configuration ID
cell_types = {
    'Wall': 'wall',
    'Window': 'window',
    'Chair': 'source',
    'Door': 'doors',
    'Mechanical Equipmen': 'vents',
    'Workstation': 'workstation',
}


def build_default_config(shape: tuple[int, ...], cell_size: float):
    return {
        'shape': shape,
        'wrapped': False,
        'cells': {
            'default': {
                'delay': 'transport',
                'cell_type': 'CO2_cell',
                'state': {
                    'counter': -1,
                    'concentration': 500,
                    'type': -100,
                    'breathing_counter': 0,
                },
                'config': {
                    'co2_production': 0.0155,
                    'cell_size': cell_size,
                    'base': 500,
                    'resp_time': 1,
                    'window_conc': 400,
                    'vent_conc': 400,
                    'breathing_rate': 5,
                    'time_active': 500,
                    'start_time': 50,
                },
                'neighborhood': [
                    {
                        'type': 'von_neumann',
                        'range': 1,
                        'vicinity': 0,
                    },
                ],
            },
            'wall': {
                'state': {
                    'concentration': 0,
                    'type': -300,  # We don't need to specify counter, as it matches the default one
                },
            },
            'window': {
                'state': {
                    'concentration': 400,
                    'type': -500,
                },
            },
            'doors': {
                'state': {
                    'type': -400,  # We don't need to specify concentration, as it matches the default one
                },
            },
            'source': {
                'state': {
                    'type': -200,
                },
            },
            'vents': {
                'state': {
                    'concentration': 300,
                    'type': -600,
                },
            },
            'workstation': {
                'state': {
                    'type': -700,
                },
            },
        },
        'cell_map': {},
    }


def get_cell_type(data_in: list[tuple[str, str]], default_type: str = 'Air', min_points: float = 3) -> str | None:
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
    return cell_types.get(point)


if __name__ == '__main__':
    cell_size = (1, 1, 1)  # Dimension for each cell (in this case, each cell is a cubic meter)
    default_cell_type = 'Air'  # By default, all cells are of type 'Air'
    min_points = 3  # By default, we need at least 3 points inside a cell to reconsider its type

    # We create a new scenario configuration
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
    json_file = build_default_config(shape, 25)  # TODO where does 25 come from?

    # We add the custom configuration for those cells that have at least one raytraced point
    for cell_id, data in data_cell.items():
        cell_type = get_cell_type(data, default_cell_type, min_points)
        if cell_type is not None:
            if cell_type not in json_file['cell_map']:
                json_file['cell_map'][cell_type] = list()
            json_file['cell_map'][cell_type].append(cell_id)

    # We store the outcome in a JSON file
    with open('data/celldevs_data.json', 'w') as f:
        json.dump(json_file, f, indent=4)
