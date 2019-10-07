#version 300 es        // NEWER VERSION OF GLSL
precision highp float; // HIGH PRECISION FLOATS

uniform float uTime;   // TIME, IN SECONDS
in vec3 vPos;          // POSITION IN IMAGE
out vec4 fragColor;    // RESULT WILL GO HERE
const int NS = 2;
const int NL = 1;
const int CUBE = 6;
const int OCT = 8;
const float fl = 10.;
const vec3 E = vec3(0.,0.,1.);
vec4 n_front,n_back;
struct Material {
      vec3  ambient;
      vec3  diffuse;
      vec3  specular;
      float power;
      vec3  reflect;
      vec3  transparent;
      float indexOfRefraction;
};
struct Shape {
      int   type;   // 0 for sphere. 1 
      vec4  center;
      float size;
      mat4  matrix;
      mat4  imatrix;
      
};
uniform Material uMaterials[NS];
uniform Shape uShapes[NS];
vec3 Ldir[NL], Lcol[NL];
vec2 rayShape(vec4 v, vec4 w, Shape s){
    if(s.type == 1){
        vec3 vv = v.xyz-s.center.xyz;
        float B = dot(w.xyz,vv);
        float C = dot(vv,vv)-s.size*s.size; //20
        if((B*B-C)<0.){
            return vec2 (-1.,-1.);
        } 
        return vec2(-B-sqrt(B*B-C),-B+sqrt(B*B-C));
    }
    if(s.type == 2){
        vec4 V = vec4(v.xyz-(s.center*s.matrix).xyz,1);
   
        vec4 cube[CUBE] ;
        cube[0] = vec4(-1,0,0,-s.size)*s.imatrix;
        cube[1] = vec4( 1,0,0,-s.size)*s.imatrix;
        cube[2] = vec4(0,-1,0,-s.size)*s.imatrix;
        cube[3] = vec4(0, 1,0,-s.size)*s.imatrix;
        cube[4] = vec4(0,0,-1,-s.size)*s.imatrix;
        cube[5] = vec4(0,0, 1,-s.size)*s.imatrix;
        float tMin = -1000.;
        float tMax = 1000.;
        for(int i = 0;i<CUBE;i++){
            float pv = dot(cube[i],V);
            float t = -pv/dot(cube[i],w);
            if(pv>0.&& t<0.){
                return vec2(-1,-1);         
            }
            if(pv>0. && t>0.){
                if(t>tMin){
                    tMin = t; 
                    n_front = cube[i];          
                }
            }
            if(pv<0. && t> 0.){
                if(t<tMax){        
                    tMax = t; 
                    n_back = cube[i];                             
                }
            }           
        }
        if(tMax > tMin){
            return vec2(tMin,tMax);
        }        
        return vec2(-2,-2.);       
    }
    if(s.type == 3){
        vec4 V = vec4(v.xyz-(s.center).xyz,1);
        vec4 cube[OCT] ;
        float r3 = 1./sqrt(3.);
        cube[0] = vec4(-r3,-r3,-r3,-s.size)*s.imatrix;
        cube[1] = vec4( r3,-r3,-r3,-s.size)*s.imatrix;
        cube[2] = vec4(-r3, r3,-r3,-s.size)*s.imatrix;
        cube[3] = vec4( r3, r3,-r3,-s.size)*s.imatrix;
        cube[4] = vec4(-r3,-r3, r3,-s.size)*s.imatrix;
        cube[5] = vec4( r3,-r3, r3,-s.size)*s.imatrix;
        cube[6] = vec4(-r3, r3, r3,-s.size)*s.imatrix;
        cube[7] = vec4( r3, r3, r3,-s.size)*s.imatrix;       
        float tMin = -1000.;
        float tMax = 1000.;
        for(int i = 0;i<OCT;i++){
            float pv = dot(cube[i],V);
            float t = -pv/dot(cube[i],w);
            if(pv>0.&& t<0.){
                return vec2(-1,-1);         
            }
            if(pv>0. && t>0.){
                if(t>tMin){
                    tMin = t;
                    n_front = cube[i];          
                }
            }
            if(pv<0. && t> 0.){
                if(t<tMax){        
                    tMax = t;
                    n_back = cube[i];                                 
                }
            }           
        }
        if(tMax > tMin){
            return vec2(tMin,tMax);
        }        
        return vec2(-2,-2.); 
        
    }
    return vec2(.0,.0);
}
bool isInShadow(vec3 P, vec3 L){ // is point P in shadow from light L?
    for(int i = 0;i<NS;i++){
        if(rayShape(vec4(P,1),vec4(L,0),uShapes[i]).x>0.001){
            return true;
        }//30
    }
    return false;
}
vec3 phongShading(vec3 P, vec3 N, Shape S, Material M){
    vec3 color = M.ambient;
    for(int i = 0;i<NL;i++){
        if(!isInShadow(P,Ldir[i])){
            color+= Lcol[i]*M.diffuse*max(0.,dot(N,Ldir[i]));
            vec3 R = 2.*dot(N,Ldir[i])*N-Ldir[i];
            color+= Lcol[i]*M.specular.xyz*pow(max(0.,dot(E,R)),M.power);
        }
    }
    return color;
}
vec3 surfaceNormal(vec3 P, Shape s){
    if(s.type == 1){
        return normalize(P-s.center.xyz);
    }
    if(s.type == 2){
        return normalize(n_front).xyz;
    }
    if(s.type == 3){
    return normalize(n_front).xyz;
    }
    return vec3(0,0,0);
}
vec3 reflection(vec3 P,vec3 ww){   
    float tMin = 1000.;
    Shape ss;
    Material mm;
    vec3 pp, nn;
    for(int j = 0;j<NS;j++){
        float t = rayShape(vec4(P,1),vec4(ww,0),uShapes[j]).x;
        if(t>0. && t< tMin){
          ss = uShapes[j];
          mm = uMaterials[j];
          pp = P+t*ww;
          nn = surfaceNormal(pp,ss);
          tMin = t;
         }
    }
    if(tMin<1000.){
         return phongShading(pp,nn,ss,mm); 
    }
    return vec3(0,0,0);
}
vec3 refractRay(vec3 W, vec3 N, float indexOfRefra){
    vec3 wc = dot(W,N)*N;
    vec3 ws = W-wc;
    vec3 wss = ws/indexOfRefra;
    vec3 wcc = -N*sqrt(1.-dot(wss,wss));
    return wcc+wss;

}

void main() {

    Ldir[0] = normalize(vec3(100,0,1));
    Lcol[0] = vec3(.5,.3,.5);

    /*Ldir[1] = normalize(vec3(-5.,-50.,100.));
    Lcol[1] = vec3(.2,.3,0.5); //40*/
    vec3 v = vec3(.2,-.2,fl);
    vec4 v4 = vec4(v,1);
    vec3 w = normalize(vec3(vPos.xy,-fl));
    vec4 w4 = vec4(w,0);
    
    float tMin = 1000.;
    Shape s;
    Material m;
    vec3 color = vec3(0.01,0,0.1);
    for(int i = 0;i<NS;i++){
        float t = rayShape(v4,w4,uShapes[i]).x;
        if(t>0. && t<tMin){           
            tMin = t; //60
            s = uShapes[i];
            m = uMaterials[i];
        }
    }
    vec3 P = v+tMin*w;
    vec3 N = surfaceNormal(P,s);
    
    if(tMin<1000.){
    color = phongShading(P,N,s,m);
    if(length(m.reflect)>0.){
        vec3 ww = w-2.*dot(N,w)*N;
        color +=m.reflect*reflection(P,ww);
    }
    if(length(m.transparent)>0.){
        vec3 ww = refractRay(w,N,m.indexOfRefraction);
        float tt = rayShape(vec4(P-ww/100.,1),vec4(ww,0),s).y;
        vec3 pp = P+tt*ww;
        vec3 nn = normalize(n_back.xyz);
        vec3 www = refractRay(ww,nn,1./m.indexOfRefraction) ; 
        //color+= m.transparent*reflection(pp,www);
        color+=phongShading(pp,nn,s,m);
        Shape ss;
        Material mm;
        float tMin = 1000.;
        vec3 ppp, nnn;
        for(int i = 0;i< NS;i++){
            float t = rayShape(vec4(pp,1),vec4(www,0),uShapes[i]).x;
            if(t>0.001 && t < tMin){
                ss = uShapes[i];
                mm = uMaterials[i];
                ppp = pp+t*www;
                nnn = surfaceNormal(pp,ss);
                tMin = t;
            }
            if(tMin < 1000.){
                vec3 rgb = phongShading(ppp,nnn,ss,mm);
                color += rgb*m.transparent;
            }
        }
        
    }
}
    fragColor = vec4(sqrt(color), 1.0);
    
    
}


                
                      
