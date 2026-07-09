import {useState} from "react";
import {Link, useNavigate} from "react-router-dom";
import API from "../services/api";


function Login(){

const [username,setUsername]=useState("");
const [password,setPassword]=useState("");

const navigate = useNavigate();


const login=async()=>{

try{

const res = await API.post(
"/token/",
{
username,
password
}
);


localStorage.setItem(
"access",
res.data.access
);


localStorage.setItem(
"username",
username
);


alert("Authentication Successful ✅");


navigate("/dashboard");


}

catch(error){

alert("Invalid Login");

}

};



return(

<div className="auth-container">


<div className="auth-card">


<div className="logo">
💰
</div>


<h1>
BudgetBuddy
</h1>



<input

placeholder="Username"

onChange={(e)=>setUsername(e.target.value)}

/>



<input

type="password"

placeholder="Password"

onChange={(e)=>setPassword(e.target.value)}

/>



<button onClick={login}>

Login

</button>



<br/><br/>


<Link to="/register">

Create Account

</Link>



</div>


</div>

)

}


export default Login;