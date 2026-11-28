#pragma once
#include <stdint.h>
#include <map>
#include <string>
#include "esp_http_server.h" // ESP_OK/ESP_FAIL in the shared host mock.

using nvs_handle_t=uint32_t;
constexpr int NVS_READWRITE=1, ESP_ERR_NVS_NOT_FOUND=0x1102;
namespace fakenvs {
inline bool failOpen=false,failRead=false,failWrite=false,failCommit=false;
inline std::map<std::string,uint32_t> values;
inline std::string ns,pendingKey;
inline uint32_t pendingValue=0;
}
inline esp_err_t nvs_open(const char* ns,int,nvs_handle_t* handle){
  if(fakenvs::failOpen)return ESP_FAIL;
  fakenvs::ns=ns;fakenvs::pendingKey.clear();*handle=1;return ESP_OK;
}
inline esp_err_t nvs_get_u32(nvs_handle_t,const char* key,uint32_t* out){
  if(fakenvs::failRead)return ESP_FAIL;
  auto it=fakenvs::values.find(fakenvs::ns+"/"+key);
  if(it==fakenvs::values.end())return ESP_ERR_NVS_NOT_FOUND;
  *out=it->second;return ESP_OK;
}
inline esp_err_t nvs_set_u32(nvs_handle_t,const char* key,uint32_t value){
  if(fakenvs::failWrite)return ESP_FAIL;
  fakenvs::pendingKey=fakenvs::ns+"/"+key;fakenvs::pendingValue=value;return ESP_OK;
}
inline esp_err_t nvs_commit(nvs_handle_t){
  if(fakenvs::failCommit)return ESP_FAIL;
  if(!fakenvs::pendingKey.empty())fakenvs::values[fakenvs::pendingKey]=fakenvs::pendingValue;
  fakenvs::pendingKey.clear();return ESP_OK;
}
inline void nvs_close(nvs_handle_t){fakenvs::pendingKey.clear();}
