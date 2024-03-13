/* Assignment 3: Earthquake Visualization
 * UMN CSCI 4611 Instructors 2012+
 * GopherGfx implementation by Evan Suma Rosenberg <suma@umn.edu> 2022-2024
 * License: Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International
 * Please do not distribute outside the course without permission from the instructor
 */ 

import * as gfx from 'gophergfx'
import { EarthquakeMarker } from './EarthquakeMarker';
import { EarthquakeRecord } from './EarthquakeRecord';

export class Earth extends gfx.Node3
{
    private earthMesh: gfx.MorphMesh3;

    public globeMode: boolean;
    private morphTime: number = 0;
    private morphDuration: number = 1;
    public angle: number = 0;

    constructor()
    {
        // Call the superclass constructor
        super();

        this.earthMesh = new gfx.MorphMesh3();

        this.globeMode = false;
    }

    public initialize(): void
    {
         // Initialize texture: you can change to a lower-res texture here if needed
        // Note that this won't display properly until you assign texture coordinates to the mesh
        this.earthMesh.material.texture = new gfx.Texture('./assets/earth-2k.png');

        // These parameters determine the appearance in the wireframe and vertex display modes
        this.earthMesh.material.ambientColor.set(0, 1, 1);
        this.earthMesh.material.pointSize = 10;
        
        // This disables mipmapping, which makes the texture appear sharper
        this.earthMesh.material.texture.setMinFilter(true, false);   

        // Add the mesh as a child of this node
        this.add(this.earthMesh);
    }


    // You should use meshResolution to define the resolution of your flat map and globe map
    // using a nested loop. 20x20 is reasonable for a good looking sphere, and you don't
    // need to change the default value to complete the base assignment  However, if you want 
    // to use height map or bathymetry data for a wizard bonus, you might need to increase
    // the default mesh resolution to get better results.
    public createMesh(meshResolution: number): void
    {
        // Precalculated vertices and normals for the earth plane mesh.
        // After we compute them, we can store them directly in the earthMesh,
        // so they don't need to be member variables.
        const mapVertices: gfx.Vector3[] = [];
        const mapNormals: gfx.Vector3[] = [];
        //Part 1
        const indices: number[] = [];
        const rows = meshResolution;
        const cols = meshResolution;
        //Create flatmap vertices
        for(let row = 0; row <= rows; row++){
            for(let col = 0; col <= cols; col++){
                const x = gfx.MathUtils.lerp(-90, 90, col/cols);
                const y = gfx.MathUtils.lerp(-180, 180, row/rows);
                mapVertices.push(this.convertLatLongToPlane(x,y));
                mapNormals.push(new gfx.Vector3(0, 0, 1));
            }
        }
        //Create indices/triangles
        for(let row = 0; row < rows; row++){
            for(let col = 0; col < cols; col++){
                const bottomLeftIndex = row + col*(meshResolution + 1);
                const bottomRightIndex = row + (col + 1)*(meshResolution + 1);
                const topLeftIndex = bottomLeftIndex + 1;
                const topRightIndex = bottomRightIndex + 1;
                indices.push(topLeftIndex, bottomLeftIndex, topRightIndex);
                indices.push(topRightIndex, bottomLeftIndex, bottomRightIndex);
            }
        }
        // Part 2: Texturing the Mesh
        const texCoords: number[] = [];
        for(let row = 0; row <= rows; row++){
            for(let col = cols; col >= 0; col--){
                const u = gfx.MathUtils.lerp(0, 1, row/rows);
                const v = gfx.MathUtils.lerp(0, 1, col/cols);
                texCoords.push(u, v);
            }
        }
        // Set the flat map mesh data. This functions, which are part of the Mesh3 class, copy
        // the vertices, normals, indices, and texture coordinates from CPU memory to GPU memory. 
        this.earthMesh.setVertices(mapVertices, true);
        this.earthMesh.setNormals(mapNormals, true);
        this.earthMesh.setIndices(indices);
        this.earthMesh.setTextureCoordinates(texCoords);


        // Part 3: Creating the Globe Mesh
        // You will need to compute another set of vertices and normals for the globe mesh.
        // For debugging purposes, it may be useful to overwrite the flap map vertices and
        // normals using the setVertices() and setNormals() methods above, and then use the
        // wireframe and vertex display modes to visually inspect the structure of the mesh.
        // However, once you are confident the globe vertices and normals are correct, you
        // should to add them to the earth as morph targets using the appropriate functions.
        // You will also need to add code in the convertLatLongToSphere() method below.
        const globeVertices: gfx.Vector3[] = [];
        const globeNormals: gfx.Vector3[] = [];
        for(let row = 0; row <= rows; row++){
            for(let col = 0; col <= cols; col++){
                //Get corresponding 3D vertex from latitude and longitude
                const x = gfx.MathUtils.lerp(-90, 90, col/cols);
                const y = gfx.MathUtils.lerp(-180, 180, row/rows);
                const vertex = this.convertLatLongToSphere(x,y);
                globeVertices.push(vertex);
                //Vector from center to vertex is just vertex, so normalize it
                const norm = this.convertLatLongToSphere(x,y);
                norm.normalize();
                globeNormals.push(norm);
            }
        }
        this.earthMesh.setMorphTargetVertices(globeVertices, true);
        this.earthMesh.setMorphTargetNormals(globeNormals, true);
        // After the mesh geometry is updated, we need to recompute the wireframe.
        // This is only necessary for debugging in the wireframe display mode.
        this.earthMesh.material.updateWireframeBuffer(this.earthMesh);
    }


    public update(deltaTime: number) : void
    {
         //Wizard bonus: rotation to Earth

        // if(this.globeMode){
        //     this.angle += Math.PI * 0.001;
        //     this.rotation.setEulerAngles(0, this.angle, 0);
        // } else{
        //     this.angle = 0;
        //     this.rotation.setEulerAngles(0, 0, 0);
        // }

        // Part 4: Morphing Between the Map and Globe
        // The value of this.globeMode will be changed whenever
        // the user selects flat map or globe mode in the GUI.
        // You should use this boolean to control the morphing
        // of the earth mesh, as described in the readme.

        //Morph from globe to map
        if(this.globeMode && this.earthMesh.morphAlpha < 1){
            //Gradually change morphAlpha value based on time elapsed so that vertices progressively move rather than immediate transition
            this.morphTime += deltaTime;
            this.earthMesh.morphAlpha = gfx.MathUtils.clamp(this.morphTime / this.morphDuration, 0, 1)
        } else if(!this.globeMode && this.earthMesh.morphAlpha > 0) { //Morph from map to globe
            this.morphTime += deltaTime;
            this.earthMesh.morphAlpha = 1 - gfx.MathUtils.clamp(this.morphTime / this.morphDuration, 0, 1);;
        }
        //Reset once transition is complete
        if((this.globeMode && this.earthMesh.morphAlpha == 1) || (!this.globeMode && this.earthMesh.morphAlpha == 0)){
            this.morphTime = 0;
        }
    }


    public createEarthquake(record: EarthquakeRecord)
    {
        // Number of milliseconds in 1 year (approx.)
        const duration = 12 * 28 * 24 * 60 * 60;

        // Part 5: Creating the Earthquake Markers
        // Currently, the earthquakes are just placed randomly on the plane. 
        // You will need to update this code to correctly calculate both the 
        // map and globe positions of the markers.
        const mapPos = this.convertLatLongToPlane(record.latitude, record.longitude);
        const globePos = this.convertLatLongToSphere(record.latitude, record.longitude);
        const earthquake = new EarthquakeMarker(mapPos, globePos, record, duration);
        //Min and max values for magnitude and size for lerping/visualization
        const minMagnitude = 5.0;
        const maxMagnitude = 9.0;
        const minSize = 0.1; 
        const maxSize = 0.5;
        //Get size and color of earthquake based on magnitude
        const normMagnitude = gfx.MathUtils.clamp((record.magnitude-minMagnitude) / (maxMagnitude-minMagnitude), 0, 1);
        const size = gfx.MathUtils.lerp(minSize, maxSize, normMagnitude);
        earthquake.scale.set(size, size, size);
        const colorLow = new gfx.Color(1, 1, 0);
        const colorHigh = new gfx.Color(1, 0, 0);
        const color = new gfx.Color();
        color.lerp(colorLow, colorHigh, normMagnitude);
        earthquake.material.setColor(color);
        this.add(earthquake);
    }


    public animateEarthquakes(currentTime : number)
    {
        // This code removes earthquake markers after their life has expired
        this.children.forEach((quake: gfx.Node3) => {

            if(quake instanceof EarthquakeMarker)
            {
                const playbackLife = (quake as EarthquakeMarker).getPlaybackLife(currentTime);

                // The earthquake has exceeded its lifespan and should be moved from the scene
                if(playbackLife >= 1)
                {
                    quake.remove();
                }
                // The earthquake position should be updated
                else
                {

                    // Part 6: Morphing the Earthquake Positions
                    // If you have correctly computed the flat map and globe positions
                    // for each earthquake marker in part 5, then you can simply lerp
                    // between them using the same alpha as the earth mesh.
                    const alpha = this.earthMesh.morphAlpha;
                    const currPos = new gfx.Vector3();
                    currPos.lerp(quake.mapPosition, quake.globePosition, alpha);
                    quake.position.set(currPos.x, currPos.y, currPos.z);

                }
            }
        });

    }


    // This convenience method converts from latitude and longitude (in degrees) to a Vector3 object
    // in the flat map coordinate system described in the readme.
    public convertLatLongToPlane(latitude: number, longitude: number): gfx.Vector3
    {
        return new gfx.Vector3(longitude * Math.PI / 180, latitude * Math.PI / 180, 0);
    }


    // This convenience method converts from latitude and longitude (in degrees) to a Vector3 object
    // in the globe mesh map coordinate system described in the readme.
    public convertLatLongToSphere(latitude: number, longitude: number): gfx.Vector3
    {
        const x = Math.cos(latitude*(Math.PI/180)) * Math.sin(longitude*(Math.PI/180));
        const y = Math.sin(latitude * (Math.PI/180));
        const z = Math.cos(latitude*(Math.PI/180)) * Math.cos(longitude*(Math.PI/180));
        return new gfx.Vector3(x, y, z);
    }


    // This function toggles between the textured, wireframe, and vertex display modes
    public changeDisplayMode(displayMode : string)
    {
        if (displayMode == 'Textured')
        {
            this.earthMesh.material.materialMode = gfx.MorphMaterialMode.SHADED;
        }
        else if (displayMode == 'Wireframe')
        {
            this.earthMesh.material.materialMode = gfx.MorphMaterialMode.WIREFRAME;
        }
        else if (displayMode == 'Vertices')
        {
            this.earthMesh.material.materialMode = gfx.MorphMaterialMode.VERTICES;
        }
    }
}