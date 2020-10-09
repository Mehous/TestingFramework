class GestureClass {

    constructor(name, index) {
        this.name = name;
        this.samples = [];
        this.index = index;
        this.TperG = 0;
    }

    addSample(data){
        this.samples.push(data);
        this.TperG += 1;
    }

    getSample(){
        return this.samples;
    }

}

module.exports = {
    GestureClass
};