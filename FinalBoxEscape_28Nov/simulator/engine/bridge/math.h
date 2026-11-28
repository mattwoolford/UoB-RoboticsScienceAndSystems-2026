#pragma once
extern "C" float m_cos(float), m_sin(float),m_hypot(float,float),m_remainder(float,float),m_atan2(float,float);
extern "C" long m_lround(float);
inline bool isfinite(float x){ return __builtin_isfinite(x);}
inline float cosf(float x){return m_cos(x);}
inline float sinf(float x){return m_sin(x);}
inline float hypotf(float x,float y){return m_hypot(x,y);}
inline float remainderf(float x,float y){return m_remainder(x,y);}
inline long lroundf(float x){return m_lround(x);}
inline float fabsf(float x){return __builtin_fabsf(x);}
inline float roundf(float x){return (float)m_lround(x);}
inline float fminf(float x,float y){return x<y?x:y;}
inline float fmaxf(float x,float y){return x>y?x:y;}
inline float atan2f(float x,float y){return m_atan2(x,y);}
namespace std{using ::isfinite; inline float hypot(float x,float y){return hypotf(x,y);} }
