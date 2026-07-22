import {useState} from "react";
import {Link} from "react-router-dom";
import API from "../services/api";


function Register(){


const [username,setUsername]=useState("");

const [email,setEmail]=useState("");

const [password,setPassword]=useState("");


const register = async () => {

    console.log("Register button clicked");

    try {

        console.log("Base URL:", API.defaults.baseURL);

        const response = await API.post(
            "/users/register/",
            {
                username,
                email,
                password,
            }
        );

        console.log("SUCCESS:", response);

        alert("Account Created Successfully ✅");

    } catch (error) {

        console.log("FULL ERROR:", error);
        console.log("CONFIG:", error.config);
        console.log("REQUEST:", error.request);
        alert(JSON.stringify(error.response.data));

        alert("Registration Failed");
    }
}



return(

<div className="auth-container">


<div className="auth-card">


<div className="logo">

📝

</div>


<h1>

Create Account

</h1>



<input

placeholder="Username"

onChange={(e)=>setUsername(e.target.value)}

/>



<input

placeholder="Email"

onChange={(e)=>setEmail(e.target.value)}

/>



<input

type="password"

placeholder="Password"

onChange={(e)=>setPassword(e.target.value)}

/>



<button onClick={register}>

Register

</button>



<br/><br/>


<Link to="/">

⬅ Back To Login

</Link>



</div>


</div>

)

}


export default Register;