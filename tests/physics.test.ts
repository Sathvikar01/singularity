import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { createBody, step, neutralInputs } from '../shared/physics.ts';
test('simulation is deterministic and remains finite',()=>{const a=createBody(),b=createBody(); for(let i=0;i<300;i++){step(a,neutralInputs());step(b,neutralInputs());} assert.deepEqual(a,b); assert.ok(a.nodes.every(n=>Number.isFinite(n.x+n.y+n.z)));});
test('leg input propels the shared body',()=>{const a=createBody();const input=neutralInputs();input[4].z=1;input[5].z=1; for(let i=0;i<100;i++)step(a,input);assert.ok(a.nodes[0].z>2);});
test('checkpoints cannot be skipped',()=>{const a=createBody();for(const n of a.nodes)n.z+=45;step(a,neutralInputs());assert.equal(a.stage,0);});
test('falls recover at checkpoint with penalty',()=>{const a=createBody();for(const n of a.nodes)n.y=-20;step(a,neutralInputs());assert.equal(a.falls,1);assert.ok(a.nodes[0].y>0);});
