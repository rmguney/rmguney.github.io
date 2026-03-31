{
    vec3 rimViewDir = normalize(vViewPosition);
    float rimFresnel = pow(1.0 - abs(dot(normalize(normal), rimViewDir)), rimPower);
    outgoingLight += rimColor * rimFresnel * rimStrength;
}
