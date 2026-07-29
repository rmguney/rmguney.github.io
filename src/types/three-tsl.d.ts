export interface TSLNode {
    readonly isNode?: true;
}

export interface TSLVec4Node extends TSLNode {
    readonly rgb: TSLNode;
    readonly a: TSLNode;
}

export interface TSLShaderFn {
    (args: Record<string, TSLNode>): TSLNode;
    readonly isNode?: true;
}

export declare function wgslFn(code: string, includes?: TSLShaderFn[]): TSLShaderFn;
export declare function glslFn(code: string, includes?: TSLShaderFn[]): TSLShaderFn;

export interface TSLUniformNode<T> extends TSLNode {
    value: T;
}

export declare const output: TSLVec4Node;
export declare const normalView: TSLNode;
export declare const normalWorld: TSLNode;
export declare const positionViewDirection: TSLNode;
export declare const positionGeometry: TSLNode;

export declare function vec3(...args: Array<number | TSLNode>): TSLNode;
export declare function vec4(...args: Array<number | TSLNode>): TSLNode;
export declare function float(value: number | TSLNode): TSLNode;
export declare function uniform<T>(value: T): TSLUniformNode<T>;

export declare function add(a: TSLNode, b: TSLNode): TSLNode;
export declare function sub(a: TSLNode, b: TSLNode): TSLNode;
export declare function mul(a: TSLNode, b: TSLNode): TSLNode;
export declare function div(a: TSLNode, b: TSLNode): TSLNode;
export declare function dot(a: TSLNode, b: TSLNode): TSLNode;
export declare function abs(a: TSLNode): TSLNode;
export declare function length(a: TSLNode): TSLNode;
export declare function max(a: TSLNode, b: TSLNode): TSLNode;
export declare function mix(a: TSLNode, b: TSLNode, t: TSLNode): TSLNode;
export declare function smoothstep(edge0: TSLNode, edge1: TSLNode, x: TSLNode): TSLNode;
