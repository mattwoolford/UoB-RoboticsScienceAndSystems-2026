//
// Created by Matt Woolford on 12/10/2026.
//

#include "Sound.h"
#include <cmath>

int Sound::BASE = 440;

int Sound::Octave(int octaves) {
    return octaves * 12;
}

float Sound::transposeFrequency(float base_frequency_hz, int semitones) {
    return base_frequency_hz * std::pow(2.0f, semitones / 12.0f);
}
