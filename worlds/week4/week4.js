"use strict"

let cursor;
let setMatrix = (loc, mat) => {
    gl.uniformMatrix4fv(loc['matrix' ], false, mat);
    gl.uniformMatrix4fv(loc['imatrix'], false, inverse(mat));
 }
let identity = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
let translate=(x,y,z)=>{
    return [1,0,0,0, 0,1,0,0, 0,0,1,0, x,y,z,1];
}

var rotateX = (theta)=>{
    let c = Math.cos(theta);
    let s = Math.sin(theta);
    return [1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,0,0,1];
}

let rotateY = (theta)=>{
    let c = Math.cos(theta);
    let s = Math.sin(theta);
    return [c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1]
}
var rotateZ = (theta)=>{
    let c = Math.cos(theta);
    let s = Math.sin(theta);
    return [c,s,0,0, -s,c,0,0, 0,0,1,0, 0,0,0,1]
}
let scale = (x,y,z)=>{
    return [x,0,0,0, 0,y,0,0, 0,0,z,0, 0,0,0,1]
}
/*
0 4 8  12 a 
1 5 9  13 b
2 6 10 14 c
3 7 11 15 d
*/
let multiply = (x,y)=>{
    var res = new Array(16);
    for(let i = 0; i<4;i++){ 
        for(let j = 0;j<4;j++){
            res[4*i+j] = x[j]*y[i*4]+x[j+4]*y[i*4+1]+x[j+8]*y[i*4+2]+x[j+12]*y[i*4+3];
        }
    }    
    return res;
}


async function setup(state) {
    let libSources = await MREditor.loadAndRegisterShaderLibrariesForLiveEditing(gl, "libs", [
        { 
            key : "pnoise", path : "shaders/noise.glsl", foldDefault : true
        },
        {
            key : "sharedlib1", path : "shaders/sharedlib1.glsl", foldDefault : true
        },      
    ]);

    if (!libSources) {
        throw new Error("Could not load shader library");
    }

    // load vertex and fragment shaders from the server, register with the editor
    let shaderSource = await MREditor.loadAndRegisterShaderForLiveEditing(
        gl,
        "mainShader",
        { 
            onNeedsCompilation : (args, libMap, userData) => {
                const stages = [args.vertex, args.fragment];
                const output = [args.vertex, args.fragment];

                const implicitNoiseInclude = true;
                if (implicitNoiseInclude) {
                    let libCode = MREditor.libMap.get("pnoise");

                    for (let i = 0; i < 2; i += 1) {
                        const stageCode = stages[i];
                        const hdrEndIdx = stageCode.indexOf(';');
                        
                        /*
                        const hdr = stageCode.substring(0, hdrEndIdx + 1);
                        output[i] = hdr + "\n#line 1 1\n" + 
                                    libCode + "\n#line " + (hdr.split('\n').length) + " 0\n" + 
                                    stageCode.substring(hdrEndIdx + 1);
                        console.log(output[i]);
                        */
                        const hdr = stageCode.substring(0, hdrEndIdx + 1);
                        
                        output[i] = hdr + "\n#line 2 1\n" + 
                                    "#include<pnoise>\n#line " + (hdr.split('\n').length + 1) + " 0" + 
                            stageCode.substring(hdrEndIdx + 1);

                        console.log(output[i]);
                    }
                }

                MREditor.preprocessAndCreateShaderProgramFromStringsAndHandleErrors(
                    output[0],
                    output[1],
                    libMap
                );
            },
            onAfterCompilation : (program) => {
                state.program = program;

                gl.useProgram(program);

                state.uCursorLoc       = gl.getUniformLocation(program, 'uCursor');
                state.uModelLoc        = gl.getUniformLocation(program, 'uModel');
                state.uProjLoc         = gl.getUniformLocation(program, 'uProj');
                state.uTimeLoc         = gl.getUniformLocation(program, 'uTime');
                state.uViewLoc         = gl.getUniformLocation(program, 'uView');
                
                state.uShapesLoc       = [];
                state.uShapesLoc[0]    = {};
                state.uShapesLoc[0].type    = gl.getUniformLocation(program, 'uShapes[0].type');
                state.uShapesLoc[0].center  = gl.getUniformLocation(program, 'uShapes[0].center');
                state.uShapesLoc[0].size    = gl.getUniformLocation(program, 'uShapes[0].size');
                state.uShapesLoc[0].matrix  = gl.getUniformLocation(program, 'uShapes[0].matrix');
                state.uShapesLoc[0].imatrix = gl.getUniformLocation(program, 'uShapes[0].imatrix');
                
                state.uShapesLoc[1]    = {};
                state.uShapesLoc[1].type    = gl.getUniformLocation(program, 'uShapes[1].type');
                state.uShapesLoc[1].center  = gl.getUniformLocation(program, 'uShapes[1].center');
                state.uShapesLoc[1].size    = gl.getUniformLocation(program, 'uShapes[1].size');
                state.uShapesLoc[1].matrix  = gl.getUniformLocation(program, 'uShapes[1].matrix');
                state.uShapesLoc[1].imatrix = gl.getUniformLocation(program, 'uShapes[1].imatrix');

                state.uShapesLoc[2]    = {};
                state.uShapesLoc[2].type    = gl.getUniformLocation(program, 'uShapes[2].type');
                state.uShapesLoc[2].center  = gl.getUniformLocation(program, 'uShapes[2].center');
                state.uShapesLoc[2].size    = gl.getUniformLocation(program, 'uShapes[2].size');
                state.uShapesLoc[2].matrix  = gl.getUniformLocation(program, 'uShapes[2].matrix');
                state.uShapesLoc[2].imatrix = gl.getUniformLocation(program, 'uShapes[2].imatrix');

                state.uShapesLoc[3]    = {};
                state.uShapesLoc[3].type    = gl.getUniformLocation(program, 'uShapes[3].type');
                state.uShapesLoc[3].center  = gl.getUniformLocation(program, 'uShapes[3].center');
                state.uShapesLoc[3].size    = gl.getUniformLocation(program, 'uShapes[3].size');
                state.uShapesLoc[3].matrix  = gl.getUniformLocation(program, 'uShapes[3].matrix');
                state.uShapesLoc[3].imatrix = gl.getUniformLocation(program, 'uShapes[3].imatrix');
              
                state.uMaterialsLoc    = [];
                state.uMaterialsLoc[0] = {};
                state.uMaterialsLoc[0].diffuse  = gl.getUniformLocation(program, 'uMaterials[0].diffuse');
                state.uMaterialsLoc[0].ambient  = gl.getUniformLocation(program, 'uMaterials[0].ambient');
                state.uMaterialsLoc[0].specular = gl.getUniformLocation(program, 'uMaterials[0].specular');
                state.uMaterialsLoc[0].power    = gl.getUniformLocation(program, 'uMaterials[0].power');
                state.uMaterialsLoc[0].reflect  = gl.getUniformLocation(program, 'uMaterials[0].reflect');
                state.uMaterialsLoc[0].transparent  = gl.getUniformLocation(program, 'uMaterials[0].transparent'); 
                state.uMaterialsLoc[0].indexOfRefraction = gl.getUniformLocation(program, 'uMaterials[0].indexOfRefraction')
 
                
                state.uMaterialsLoc[1] = {};
                state.uMaterialsLoc[1].diffuse  = gl.getUniformLocation(program, 'uMaterials[1].diffuse');
                state.uMaterialsLoc[1].ambient  = gl.getUniformLocation(program, 'uMaterials[1].ambient');
                state.uMaterialsLoc[1].specular = gl.getUniformLocation(program, 'uMaterials[1].specular');
                state.uMaterialsLoc[1].power    = gl.getUniformLocation(program, 'uMaterials[1].power');
                state.uMaterialsLoc[1].reflect  = gl.getUniformLocation(program, 'uMaterials[1].reflect');
                state.uMaterialsLoc[1].transparent  = gl.getUniformLocation(program, 'uMaterials[1].transparent');               
                
                state.uMaterialsLoc[2] = {};
                state.uMaterialsLoc[2].diffuse  = gl.getUniformLocation(program, 'uMaterials[2].diffuse');
                state.uMaterialsLoc[2].ambient  = gl.getUniformLocation(program, 'uMaterials[2].ambient');
                state.uMaterialsLoc[2].specular = gl.getUniformLocation(program, 'uMaterials[2].specular');
                state.uMaterialsLoc[2].power    = gl.getUniformLocation(program, 'uMaterials[2].power');
                state.uMaterialsLoc[2].reflect  = gl.getUniformLocation(program, 'uMaterials[2].reflect');
                state.uMaterialsLoc[2].transparent  = gl.getUniformLocation(program, 'uMaterials[2].transparent');                                
                state.uMaterialsLoc[3] = {};
                state.uMaterialsLoc[3].diffuse  = gl.getUniformLocation(program, 'uMaterials[3].diffuse');
                state.uMaterialsLoc[3].ambient  = gl.getUniformLocation(program, 'uMaterials[3].ambient');
                state.uMaterialsLoc[3].specular = gl.getUniformLocation(program, 'uMaterials[3].specular');
                state.uMaterialsLoc[3].power    = gl.getUniformLocation(program, 'uMaterials[3].power');
                state.uMaterialsLoc[3].reflect  = gl.getUniformLocation(program, 'uMaterials[3].reflect');
                state.uMaterialsLoc[3].transparent  = gl.getUniformLocation(program, 'uMaterials[3].transparent');            
                

            } 
        },
        {
            paths : {
                vertex   : "shaders/vertex.vert.glsl",
                fragment : "shaders/fragment.frag.glsl"
            },
            foldDefault : {
                vertex   : true,
                fragment : false
            }
        }
    );

    cursor = ScreenCursor.trackCursor(MR.getCanvas());

    if (!shaderSource) {
        throw new Error("Could not load shader");
    }


    // Create a square as a triangle strip consisting of two triangles
    state.buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, state.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,1,0, 1,1,0, -1,-1,0, 1,-1,0]), gl.STATIC_DRAW);

    // Assign aPos attribute to each vertex
    let aPos = gl.getAttribLocation(state.program, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
}



// I HAVE IMPLEMENTED inverse() FOR YOU. FOR HOMEWORK, YOU WILL STILL NEED TO IMPLEMENT:
// identity(), translate(x,y,z), rotateX(a), rotateY(a) rotateZ(a), scale(x,y,z), multiply(A,B)

let inverse = src => {
  let dst = [], det = 0, cofactor = (c, r) => {
     let s = (i, j) => src[c+i & 3 | (r+j & 3) << 2];
     return (c+r & 1 ? -1 : 1) * ( (s(1,1) * (s(2,2) * s(3,3) - s(3,2) * s(2,3)))
                                 - (s(2,1) * (s(1,2) * s(3,3) - s(3,2) * s(1,3)))
                                 + (s(3,1) * (s(1,2) * s(2,3) - s(2,2) * s(1,3))) );
  }
  for (let n = 0 ; n < 16 ; n++) dst.push(cofactor(n >> 2, n & 3));
  for (let n = 0 ; n <  4 ; n++) det += src[n] * dst[n << 2];
  for (let n = 0 ; n < 16 ; n++) dst[n] /= det;
  return dst;
}

// NOTE: t is the elapsed time since system start in ms, but
// each world could have different rules about time elapsed and whether the time
// is reset after returning to the world
function onStartFrame(t, state) {

    let tStart = t;
    if (!state.tStart) {
        state.tStart = t;
        state.time = t;
    }

    let cursorValue = () => {
       let p = cursor.position(), canvas = MR.getCanvas();
       return [ p[0] / canvas.clientWidth * 2 - 1, 1 - p[1] / canvas.clientHeight * 2, p[2] ];
    }

    tStart = state.tStart;

    let now = (t - tStart);
    // different from t, since t is the total elapsed time in the entire system, best to use "state.time"
    state.time = now;
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let time = now / 1000;

    gl.uniform3fv(state.uCursorLoc     , cursorValue());
    gl.uniform1f (state.uTimeLoc       , time);

    gl.uniform3fv(state.uMaterialsLoc[1].ambient , [.6,0.6,0]);
    gl.uniform3fv(state.uMaterialsLoc[1].diffuse , [0.3,.6,0.8]);
    gl.uniform3fv(state.uMaterialsLoc[1].specular, [.1,.8,.8]);
    gl.uniform1f (state.uMaterialsLoc[1].power   , 20);
    gl.uniform3fv(state.uMaterialsLoc[1].reflect , [.03,.06,.08]);

    gl.uniform3fv(state.uMaterialsLoc[2].ambient , [.1,.1,0.1]);
    gl.uniform3fv(state.uMaterialsLoc[2].diffuse , [.5,.5,0.5]);
    gl.uniform3fv(state.uMaterialsLoc[2].specular, [.6,.6,.6]);
    gl.uniform1f (state.uMaterialsLoc[2].power   , 10);
    gl.uniform3fv(state.uMaterialsLoc[2].reflect , [.04,0.04,0]);

    gl.uniform3fv(state.uMaterialsLoc[0].ambient , [.3,0.,0]);
    gl.uniform3fv(state.uMaterialsLoc[0].diffuse , [0.,0.,0.9]);
    gl.uniform3fv(state.uMaterialsLoc[0].specular, [0.,0.,0.9]);
    gl.uniform1f (state.uMaterialsLoc[0].power   , 20);
    gl.uniform3fv(state.uMaterialsLoc[0].reflect , [.1,.1,.1]);
    gl.uniform3fv(state.uMaterialsLoc[0].transparent , [1,1,1] );
    gl.uniform1f (state.uMaterialsLoc[0].indexOfRefraction, 1);
    
    gl.uniform3fv(state.uMaterialsLoc[3].ambient , [.1,0,0]);
    gl.uniform3fv(state.uMaterialsLoc[3].diffuse , [.5,0,0]);
    gl.uniform3fv(state.uMaterialsLoc[3].specular, [.7,.0,.0]);
    gl.uniform1f (state.uMaterialsLoc[3].power   , 10);
    gl.uniform3fv(state.uMaterialsLoc[3].reflect , [.9,0,0]);
    /*
    gl.uniform1i       (state.uShapesLoc[0].type, 2);
    gl.uniform4fv      (state.uShapesLoc[0].center,[0,0,0,1]);
    gl.uniform1f       (state.uShapesLoc[0].size,.3);
    let m0 = rotateX(time);
    setMatrix(state.uShapesLoc[0], m0);
    /*gl.uniformMatrix4fv(state.uShapesLoc[0].matrix,false,m0);
    gl.uniformMatrix4fv(state.uShapesLoc[0].imatrix,false,inverse(m0));
    */
    /*gl.uniform1i       (state.uShapesLoc[1].type, 3);
    gl.uniform4fv      (state.uShapesLoc[1].center,[0,0,-2,1]);
    gl.uniform1f       (state.uShapesLoc[1].size,.1);
    let m1 = scale(1,2,1);
    gl.uniformMatrix4fv(state.uShapesLoc[1].matrix,false,m1);
    gl.uniformMatrix4fv(state.uShapesLoc[1].imatrix,false,inverse(m1));
    
    gl.uniform1i       (state.uShapesLoc[2].type, 1);
    gl.uniform4fv      (state.uShapesLoc[2].center,[0,0,0,1]);
    gl.uniform1f       (state.uShapesLoc[2].size,.1);
    gl.uniformMatrix4fv(state.uShapesLoc[2].matrix,false,scale(1,2,1));
    gl.uniformMatrix4fv(state.uShapesLoc[2].imatrix,false,inverse(scale(1,2,1)));

    gl.uniform1i       (state.uShapesLoc[3].type, 2);
    gl.uniform4fv      (state.uShapesLoc[3].center,[0,-.5,-1,1]);
    gl.uniform1f       (state.uShapesLoc[3].size,.1);
    gl.uniformMatrix4fv(state.uShapesLoc[3].matrix,false,identity);
    gl.uniformMatrix4fv(state.uShapesLoc[3].imatrix,false,inverse(identity));
    */
    gl.uniform1i       (state.uShapesLoc[3].type, 1);
    gl.uniform4fv      (state.uShapesLoc[3].center,[Math.sin(time),0,Math.cos(time),1]);
    gl.uniform1f       (state.uShapesLoc[3].size,.1);


    gl.uniform1i       (state.uShapesLoc[0].type, 2);
    gl.uniform4fv      (state.uShapesLoc[0].center,[1,-2,0,1]);
    gl.uniform1f       (state.uShapesLoc[0].size,.5);

    gl.uniform1i       (state.uShapesLoc[1].type, 3);
    gl.uniform4fv      (state.uShapesLoc[1].center,[0,0,0,1]);
    gl.uniform1f       (state.uShapesLoc[1].size,.3);

    //let M0 = multiply(translate( .4,-.4,-.4), multiply(rotateX(-.5), scale(.3,.2,.1)));
    //let M0 = multiply(translate( .4,-.4,-.4), multiply(rotateX(-.5), scale(.3,.2,.1)));
    //let M1 = multiply(translate(-.4, .4,-.4), multiply(rotateY(2  ), scale(.2,.3,.2)));
    //let M2 = multiply(translate(-.4,-.4, .4), multiply(rotateZ(1  ), scale(.3,.2,.1)));
    let M2 = multiply(rotateY(time),scale(0.5,0.2,1));
    let M3 = multiply (scale((1.1+Math.sin(time)/2)*0.5,(1.1+Math.sin(time)/2),(1.1+Math.sin(time)/2)*0.5),rotateY(time-2));
    let M1 = scale(translate(Math.sin(time),1,-2));
    setMatrix(state.uShapesLoc[0], M2);
    setMatrix(state.uShapesLoc[1], M3);     
    setMatrix(state.uShapesLoc[2], M3);                                                      
    
    gl.enable(gl.DEPTH_TEST);
}

function onDraw(t, projMat, viewMat, state, eyeIdx) {
    const sec = state.time / 1000;

    const my = state;
  
    gl.uniformMatrix4fv(my.uModelLoc, false, new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,-1,1]));
    gl.uniformMatrix4fv(my.uViewLoc, false, new Float32Array(viewMat));
    gl.uniformMatrix4fv(my.uProjLoc, false, new Float32Array(projMat));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

}

function onEndFrame(t, state) {
}

export default function main() {
    const def = {
        name         : 'week4',
        setup        : setup,
        onStartFrame : onStartFrame,
        onEndFrame   : onEndFrame,
        onDraw       : onDraw,
    };

    return def;
}
