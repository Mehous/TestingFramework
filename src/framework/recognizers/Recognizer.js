//The Recognizer class 

const name = "Recognizer";
class Recognizer {
  constructor(dataset) {
    if (dataset !== undefined) {
      dataset.getGestureClass().forEach((gesture, key, self) => {
        gesture.getSample().forEach((sample) => {
          this.addGesture(gesture.name, sample);
        });
      });
    }
  }

  addGesture(name, sample) {
    throw new Error("You must implement this function");
  }

  recognize(sample) {
    throw new Error("You must implement this function");
  }
}

module.exports = {
  Recognizer,
};
