// Required to support THREE.Color objects
dat.GUI.prototype.addThreeColor = function (obj, name) {
    var dummy = {};
    dummy[name] = obj[name].getStyle();
    return this.addColor(dummy, name)
        .onChange(function (colorValue) {
            obj[name].setStyle(colorValue);
        });
};

var gui = new dat.GUI();
