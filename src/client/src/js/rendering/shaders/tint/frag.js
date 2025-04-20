const fragment = `
varying vec2 vTextureCoord;
uniform sampler2D uSampler;
uniform vec4 uColor; // The tint color passed from the filter

void main(void) {
    vec4 textureColor = texture2D(uSampler, vTextureCoord);
    // Multiply the texture color by the tint color
    // We use the RGB components of uColor for tinting and keep the original alpha
    gl_FragColor = vec4(textureColor.rgb * uColor.rgb, textureColor.a);
}
`;

export default fragment;
