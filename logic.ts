import { MAX_SPEED, PADDLE_HEIGHT, PADDLE_WIDTH, RADIUS, height, width } from "./constants";
import { CircleInterface, PaddleInterface, ShapeInterface, Collision, BrickInterface } from "./types";
import { SharedValue } from "react-native-reanimated";

export const createBouncingExample = ( circleObject: CircleInterface) => {
    "worklet";
    circleObject.x.value = 100;
    circleObject.y.value = 450;
    circleObject.r = RADIUS;
    circleObject.ax = 0.5;
    circleObject.ay = 0.5;
    circleObject.vx = 0;
    circleObject.vy = 0;
    circleObject.m = RADIUS * 10;

};
//console.log("in logic.ts, constant bouncing example called with CircleInterface")
export const move = (object: ShapeInterface, dt: number) => {
    "worklet";
    //console.log("in move function with ",object , "and ", dt)  
    if (object.type === "Circle") {
        object.vx += object.ax * dt
        object.vy += object.ay * dt

        if (object.vx > MAX_SPEED) {
            object.vx = MAX_SPEED;
        }

        if (object.vy > MAX_SPEED) {
            object.vy = MAX_SPEED;
        }

        if (object.vx < -MAX_SPEED) {
            object.vx = -MAX_SPEED;
        }

        if (object.vy < -MAX_SPEED) {
            object.vy = -MAX_SPEED;
        }       

        object.x.value += object.vx * dt
        object.y.value += object.vy * dt

        //console.log("done with move function")
    }
    
};

export const resolveWallCollision = (object: ShapeInterface ) => {
    "worklet";

    if (object.type === "Circle") {
            const circleObject = object as CircleInterface
            //console.log("in resolveWallCollision with ", circleObject)

            //right wall collision
            if (circleObject.x.value + circleObject.r > width) {
                circleObject.x.value = width - circleObject.r * 2;
                circleObject.vx = -circleObject.vx;
                circleObject.ax = -circleObject.ax;
            }
            //bottom wall collison
            else if (circleObject.y.value + circleObject.r > height) {
                circleObject.y.value = height - circleObject.r * 2;
                circleObject.vy = -circleObject.vy;
                circleObject.ay = -circleObject.ay;
            }
            //left wall collision
            else if (circleObject.x.value - circleObject.r < 0) {
                circleObject.x.value = circleObject.r * 2;
                circleObject.vx = -circleObject.vx;
                circleObject.ax = -circleObject.ax;
            }
            //top wall collision
            else if (circleObject.y.value - circleObject.r < 0) {
                circleObject.y.value = circleObject.r * 2;
                circleObject.vy = -circleObject.vy;
                circleObject.ay = -circleObject.ay;
            }

            return false;
    }
    //console.log("done with resolveWallCollision")
};

export const resolveCollisionWithBounce = (info: Collision) => {
    "worklet";
    //console.log("in resolveCollisionWithBounce with ", info.o1)
    const circleInfo = info.o1 as CircleInterface;

    circleInfo.y.value = circleInfo.y.value - circleInfo.r;

    if (info.o2.type === "Brick" && circleInfo.ay > 0) {
        return;
    }
    circleInfo.vx = circleInfo.vx;
    circleInfo.ax = circleInfo.ax;
    circleInfo.vy = -circleInfo.vy;
    circleInfo.ay = -circleInfo.ay;
    
};

function circleRect(
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    rw: number,
    rh: number
) {
    "worklet";
    // temporary variables to set edges for testing
    let testX = cx;
    let testY = cy;
    // which edge is closest?
    if (cx < rx) testX = rx; //test left edge
    else if (cx > rx + rw) testX = rx + rw; // right edge
    if (cy < ry) testY = ry; // top edge
    else if (cy > ry + rh) testY = ry + rh; //bottom edge
    // get distance from closest edges
    let distX = cx - testX;
    let distY = cy - testY;
    let distance = Math.sqrt(distX * distX + distY * distY);

    // if the distance is less than the radius, collision!
    if (distance <= RADIUS) {
        return true;
    } else {
        return false;
    } 
    

}

export const checkCollision = (o1: ShapeInterface, o2: ShapeInterface) => {
    "worklet";
    if ((o1.type === "Circle" && o2.type === "Paddle") || 
        (o1.type === "Circle" && o2.type === "Brick") 
    ) {
        if(o2.type === "Brick") {
            const brick = o2 as BrickInterface
            if(!brick.canCollide.value){
                return {
                    collisonInfo: null,
                    collided: false,
                };
            }
        }
        const dx = o2.x.value - o1.x.value;
        const dy = o2.y.value - o1.y.value;

        const d = Math.sqrt(Math.pow(dx,2) + Math.pow(dy,2));

        const circleObject = o1 as CircleInterface;
        const rectangleObject = o2 as PaddleInterface;

        const isCollision = circleRect(
            circleObject.x.value,
            circleObject.y.value,
            rectangleObject.x.value,
            rectangleObject.y.value,
            PADDLE_WIDTH,
            PADDLE_HEIGHT
        
        );

        if (isCollision) {
            if(o2.type === "Brick") {
                const brick = o2 as BrickInterface
                brick.canCollide.value = false;
            }
            return {
                collisonInfo: { o1, o2, dx, dy, d },
                collided: true,
            };
        }

    }
    return {
        collisonInfo: null,
        collided: false,
    };
};

export const animate = (
    objects: ShapeInterface[],
    timeSincePreviousFrame: number,
    brickCount: SharedValue<number>,
) => {
    "worklet";
    //console.log("in animate");
    for (const o of objects) {        
        move(o, (0.15 /16 ) * timeSincePreviousFrame);    
    }

    for (const o of objects) {
        const isGameLost = resolveWallCollision(o);
        if (isGameLost) {
          brickCount.value = -1;
        }
    }

    const collisions: Collision[] = [];

    for (const [i, o1] of objects.entries()) {
        for (const [j, o2] of objects.entries()) {
            if (i < j) {
                const {collided, collisonInfo} = checkCollision(o1, o2);
                if (collided && collisonInfo) {
                    collisions.push(collisonInfo);
                }
            }
        }
    }

    for (const col of collisions) {
        if(col.o2.type === "Brick") {
            brickCount.value++;
        }
        resolveCollisionWithBounce(col);
    }


};