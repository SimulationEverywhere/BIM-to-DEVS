import requests
#import pprint
import json
import base64
import urllib.parse

auth_url = 'https://developer.api.autodesk.com/authentication/v1/authenticate'
auth_data = {'client_id':'G2wBhWVQygHwUUGaLXoIiYlKGxOYV7yF',
             'client_secret':'iZzBf6TAZz7wr1kd',
             'grant_type':'client_credentials',
             'scope':'bucket:create bucket:read data:read data:create data:write'}

#['data:read', , 'viewables:read']

auth_token = requests.post(auth_url, data=auth_data).json()['access_token']
auth_header = {'Authorization':f'Bearer {auth_token}'}




buskets_url = 'https://developer.api.autodesk.com/oss/v2/buckets'
buckets_data = requests.get(buskets_url, headers=auth_header).json()

#print(json.dumps(buckets_data, indent=4, sort_keys=True))

#exit()

object_id = ''

for item in buckets_data['items']:
    name = item['bucketKey'].split('-', 1)[-1]
    #print(name)
    bucket_specifics = requests.get(f"https://developer.api.autodesk.com/oss/v2/buckets/{item['bucketKey']}/objects", headers=auth_header).json()
    #print(json.dumps(bucket_specifics, indent=4, sort_keys=True))
    for b_s_item in bucket_specifics['items']:
        object_id = b_s_item['objectId']
        #print(object_id)


file_manifest_urn_encoded = base64.urlsafe_b64encode(b"urn:adsk.viewing:fs.file:"+b"dXJuOmFkc2sud2lwcHJvZDpmcy5maWxlOnZmLkxhRUNweDhWVEJXR29pd3AwUnVqTWc_dmVyc2lvbj0x")#object_id.encode('utf-8'))
#print(file_manifest_urn_encoded)
file_manifest_url = f"https://developer.api.autodesk.com/modelderivative/v2/designdata/{file_manifest_urn_encoded.decode('utf-8')}/manifest"
print(file_manifest_url)

file_manifest = requests.get(file_manifest_url, headers=auth_header)
print(file_manifest.text)
#print(json.dumps(file_manifest.json(), indent=4, sort_keys=True))

#urns = []

#for derivative in file_manifest['derivatives']:

#for line in file_manifest.text.split('"'):
#    if line.startswith("urn:"):
#        urns.append(line)

#print('\n'.join(urns))

#for urn in urns:
#    with open(f"./files/{urn.split('/')[-1]}", mode='wb') as localfile:
#        print(urn)
#        localfile.write(requests.get("https://developer.api.autodesk.com/derivativeservice/v2/derivatives/"+urllib.parse.quote(urn), headers=auth_header).content)


#https://developer.api.autodesk.com/derivativeservice/v2/derivatives/

#https://developer.api.autodesk.com/oss/v2/buckets/ucgrfvbfjgmk0eyr5j1kmecgroh9wwsa-bucket-test/objects

#https://developer.api.autodesk.com/oss/v2/buckets/ucgrfvbfjgmk0eyr5j1kmecgroh9wwsa-bucket-test/objects/House1.rvt

'''
bim_id_url = 'https://developer.api.autodesk.com/project/v1/hubs'
bim_id = requests.get(bim_id_url, headers=auth_header).json()['data'][0]['id']


root_ls_url = f'https://developer.api.autodesk.com/project/v1/hubs/{bim_id}/projects'
root_ls_data = requests.get(root_ls_url, headers=auth_header).json()

carleton_data_object = [blob for blob in root_ls_data['data'] if blob['attributes']['name'] == "Carleton University"][0]

'''


#print(carleton_data_object)

#carleton_ls_url = f'https://developer.api.autodesk.com/hq/v1/accounts/{bim_id}/projects/{carleton_data_object["id"]}'
#carleton_ls_data = requests.get(carleton_ls_url, headers=auth_header).json()
'''
print('[')
for i,l in enumerate([
        #"https://developer.api.autodesk.com/schema/v1/versions/projects:autodesk.bim360:Project-1.0",
        "https://developer.api.autodesk.com/project/v1/hubs/b.220f0a92-c684-4014-94f2-4a7082edb32d/projects/b.f0a7658a-c977-44b9-b87a-532faae4007d",
        #"https://developer.api.autodesk.com/bim360/checklists/v1/containers/f0a7658a-c977-44b9-b87a-532faae4007d/instances", #403
        #"https://developer.api.autodesk.com/cost/v1/containers/f0a7658a-c977-44b9-b87a-532faae4007d/budgets", #invalid token, missing user
        "https://developer.api.autodesk.com/project/v1/hubs/b.220f0a92-c684-4014-94f2-4a7082edb32d",
        #"https://developer.api.autodesk.com/bim360/locations/v2/containers/b2374817-d034-437b-acaa-b711bdcb6280/trees/default/nodes",
        #"https://developer.api.autodesk.com/issues/v1/containers/f0a7658a-c977-44b9-b87a-532faae4007d/markups",
        #"https://developer.api.autodesk.com/bim360/rfis/v1/containers/f0a7658a-c977-44b9-b87a-532faae4007d/rfis", #auth-001 error
        "https://developer.api.autodesk.com/data/v1/projects/b.f0a7658a-c977-44b9-b87a-532faae4007d/folders/urn:adsk.wipprod:fs.folder:co.C-30SWxgQaqCDgZ-rJAE4w",
        #"https://developer.api.autodesk.com/submittals/v1/containers/f0a7658a-c977-44b9-b87a-532faae4007d/items", #auth-001 again
        "https://developer.api.autodesk.com/project/v1/hubs/b.220f0a92-c684-4014-94f2-4a7082edb32d/projects/b.f0a7658a-c977-44b9-b87a-532faae4007d/topFolders",
        "https://developer.api.autodesk.com/project/v1/hubs/b.220f0a92-c684-4014-94f2-4a7082edb32d/projects/b.f0a7658a-c977-44b9-b87a-532faae4007d"
        ]):
    data = requests.get(l, headers=auth_header).json()
    print(str(i)+",")
    print(json.dumps(data, indent=4, sort_keys=True)+",")

print(']')
'''
