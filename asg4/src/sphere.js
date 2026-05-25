class Sphere {
    constructor() {
        this.type = 'sphere';
        this.color = [1.0, 1.0, 1.0, 1.0];
        this.matrix = new Matrix4();
        this.textureNum = -2;
        this.tint = [1, 1, 1, 1];

        this.stacks = 24;
        this.slices = 48;

        this.vertices = [];
        this.uvs = [];

        this._buildMesh();
    }

    _buildMesh() {
        this.vertices = [];
        this.uvs = [];

        for (let stack = 0; stack < this.stacks; stack++) {
            let phi1 = (stack / this.stacks) * Math.PI;
            let phi2 = ((stack + 1) / this.stacks) * Math.PI;

            for (let slice = 0; slice < this.slices; slice++) {
                let theta1 = (slice / this.slices) * 2 * Math.PI;
                let theta2 = ((slice + 1) / this.slices) * 2 * Math.PI;

                let x1 = Math.sin(phi1) * Math.cos(theta1);
                let y1 = Math.cos(phi1);
                let z1 = Math.sin(phi1) * Math.sin(theta1);

                let x2 = Math.sin(phi1) * Math.cos(theta2);
                let y2 = Math.cos(phi1);
                let z2 = Math.sin(phi1) * Math.sin(theta2);

                let x3 = Math.sin(phi2) * Math.cos(theta1);
                let y3 = Math.cos(phi2);
                let z3 = Math.sin(phi2) * Math.sin(theta1);

                let x4 = Math.sin(phi2) * Math.cos(theta2);
                let y4 = Math.cos(phi2);
                let z4 = Math.sin(phi2) * Math.sin(theta2);

                let u1 = slice / this.slices;
                let u2 = (slice + 1) / this.slices;
                let v1 = stack / this.stacks;
                let v2 = (stack + 1) / this.stacks;

                // Triangle 1
                this.vertices.push(x1, y1, z1);
                this.vertices.push(x2, y2, z2);
                this.vertices.push(x3, y3, z3);
                this.uvs.push(u1, v1);
                this.uvs.push(u2, v1);
                this.uvs.push(u1, v2);

                // Triangle 2
                this.vertices.push(x2, y2, z2);
                this.vertices.push(x4, y4, z4);
                this.vertices.push(x3, y3, z3);
                this.uvs.push(u2, v1);
                this.uvs.push(u2, v2);
                this.uvs.push(u1, v2);
            }
        }
    }

    render() {
        setDefaultShade();

        gl.uniform1i(u_whichTexture, this.textureNum);
        gl.uniform4f(u_TintColor, this.tint[0], this.tint[1], this.tint[2], this.tint[3]);
        gl.uniform4f(u_FragColor, this.color[0], this.color[1], this.color[2], this.color[3]);
        gl.uniformMatrix4fv(u_ModelMatrix, false, this.matrix.elements);

        // Positions
        var vertBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertBuf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.DYNAMIC_DRAW);
        gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_Position);

        // UVs
        var uvBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.uvs), gl.DYNAMIC_DRAW);
        gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(a_UV);

        // Normals — on a unit sphere the vertex position IS the outward normal
        if (a_Normal >= 0) {
            var normBuf = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, normBuf);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.DYNAMIC_DRAW);
            gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(a_Normal);
        }

        gl.drawArrays(gl.TRIANGLES, 0, this.vertices.length / 3);
    }
}