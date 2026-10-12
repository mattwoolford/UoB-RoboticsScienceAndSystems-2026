//
// Created by Matt Woolford on 12/10/2026.
//

#ifndef ROBOTICSSCIENCEANDSYSTEMS_SOUND_H
#define ROBOTICSSCIENCEANDSYSTEMS_SOUND_H


class Sound {

public:
    static int BASE;

    static int Octave(int octaves);
    /**
 * @brief Calculates a frequency using 12-tone equal temperament.
 * @param base_frequency_hz Starting frequency in hertz.
 * @param semitones Pitch offset; positive raises pitch, negative lowers it.
 * @return Frequency in hertz; an offset of 12 doubles the frequency.
 */
    static float transposeFrequency(float base_frequency_hz, int semitones);

};


#endif //ROBOTICSSCIENCEANDSYSTEMS_SOUND_H
