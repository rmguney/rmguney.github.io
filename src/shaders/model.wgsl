fn modelShade(
    baseColor: vec3<f32>,
    worldNormal: vec3<f32>,
    viewNormal: vec3<f32>,
    viewDir: vec3<f32>,
    lightDir: vec3<f32>,
    celLevels: f32,
    celStrength: f32,
    celSoftness: f32,
    celFloor: f32,
    celCeiling: f32,
    rimColor: vec3<f32>,
    rimPower: f32,
    rimStrength: f32,
    saturation: f32
) -> vec3<f32> {
    let lambert = dot(normalize(worldNormal), normalize(lightDir)) * 0.5 + 0.5;
    let bandPos = lambert * celLevels;
    let bandIndex = floor(bandPos);
    let bandStep = smoothstep(0.5 - celSoftness * 0.5, 0.5 + celSoftness * 0.5, bandPos - bandIndex);
    let banded = clamp((bandIndex + bandStep + 0.5) / celLevels, 0.0, 1.0);

    let shade = mix(celFloor, celCeiling, banded);
    let shaded = baseColor * mix(1.0, shade, celStrength);

    let fresnel = pow(1.0 - abs(dot(normalize(viewNormal), normalize(viewDir))), rimPower);

    return applySaturation(shaded + rimColor * fresnel * rimStrength, saturation);
}
