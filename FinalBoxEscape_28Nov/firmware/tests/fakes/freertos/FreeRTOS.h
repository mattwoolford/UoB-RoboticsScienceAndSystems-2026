#pragma once
#include <mutex>
using portMUX_TYPE=std::mutex;
#define portMUX_INITIALIZER_UNLOCKED {}
inline void portENTER_CRITICAL(portMUX_TYPE* m){m->lock();}
inline void portEXIT_CRITICAL(portMUX_TYPE* m){m->unlock();}
