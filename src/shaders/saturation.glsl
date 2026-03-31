vec3 applySaturation(vec3 color, float amount) {
    float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
    return max(mix(vec3(luma), color, amount), vec3(0.0));
}
