#pragma once
#include <stddef.h>
constexpr int MSG_DONTWAIT=64;
inline int send(int,const void*,size_t n,int){return (int)n;}
